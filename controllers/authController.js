const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createAuditLog, getClientIP } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../utils/emailService');
const { generateAndSendOTP, verifyOTP } = require('../utils/otpService');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, faceDescriptor } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Create user
    const user = await User.create({ name, email, password, faceDescriptor });

    // Audit log
    await createAuditLog('USER_REGISTERED', user._id, { email: user.email }, getClientIP(req));

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err.message));

    // Do NOT auto-login — user must sign in with their credentials
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please sign in with your credentials.',
      data: {
        user: {
          name: user.name,
          email: user.email,
          voterId: user.voterId,
          hasFaceRegistered: !!user.faceDescriptor && user.faceDescriptor.length > 0
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// @desc    Login user (Step 1 — validate credentials, send OTP)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if MFA is enabled globally
    const mfaEnabled = process.env.MFA_ENABLED === 'true';

    if (mfaEnabled) {
      // Generate OTP and send (also return code for dev/demo alert)
      const otpResult = await generateAndSendOTP(user, 'login');

      return res.status(200).json({
        success: true,
        message: 'OTP sent. Please verify to complete login.',
        data: {
          requiresOTP: true,
          userId: user._id,
          email: user.email,
          otpCode: otpResult.code // For dev/demo — shown via browser alert
        }
      });
    }

    // No MFA — proceed with direct login
    const token = generateToken(user._id);

    // Audit log
    await createAuditLog('USER_LOGIN', user._id, { email: user.email }, getClientIP(req));

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        requiresOTP: false,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          voterId: user.voterId,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// @desc    Verify OTP to complete login (Step 2)
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otpCode } = req.body;

    const result = await verifyOTP(userId, otpCode, 'login');
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const token = generateToken(user._id);

    await createAuditLog('USER_LOGIN', user._id, { email: user.email, mfa: true }, getClientIP(req));

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          voterId: user.voterId,
          isVerified: user.isVerified
        },
        token
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed.'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { userId, purpose } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otpResult = await generateAndSendOTP(user, purpose || 'login');

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent.',
      data: {
        otpCode: otpResult.code // For dev/demo — shown via browser alert
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP.'
    });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          voterId: user.voterId,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          faceDescriptor: user.faceDescriptor
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve user profile.'
    });
  }
};

// @desc    Logout user (clear cookie)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};
