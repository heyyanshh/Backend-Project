const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('./emailService');

/**
 * Generate a 6-digit OTP, save to DB, and email it
 */
const generateAndSendOTP = async (user, purpose = 'login') => {
  // Invalidate any existing OTPs for this user and purpose
  await OTP.updateMany(
    { userId: user._id, purpose, isUsed: false },
    { isUsed: true }
  );

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();

  // Save to DB with 5-minute expiry
  await OTP.create({
    userId: user._id,
    code,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });

  // Send email (non-blocking, may fail silently in dev)
  sendOTPEmail(user, code, purpose).catch(err => console.error('OTP email failed:', err.message));

  return { success: true, code };
};

/**
 * Verify an OTP code
 */
const verifyOTP = async (userId, code, purpose = 'login') => {
  const otp = await OTP.findOne({
    userId,
    code,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });

  if (!otp) {
    return { valid: false, message: 'Invalid or expired OTP code.' };
  }

  // Mark as used
  otp.isUsed = true;
  await otp.save();

  return { valid: true };
};

module.exports = { generateAndSendOTP, verifyOTP };
