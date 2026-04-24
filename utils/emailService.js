const nodemailer = require('nodemailer');

// Create transporter — uses ENV vars or falls back to Ethereal test account
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production / real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Dev fallback — Ethereal (fake SMTP for testing)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('📧 Using Ethereal test email. Preview URLs will be logged.');
  }

  return transporter;
};

/**
 * Send a styled HTML email
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || '"E-Vote System" <noreply@evote.com>',
      to,
      subject,
      html
    });

    // Log Ethereal preview URL in dev
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Email: Registration Welcome
 */
const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: '🎉 Welcome to E-Vote System',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #5b5fc7, #8b5cf6); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🗳️ E-Vote System</h1>
          <p style="color: rgba(255,255,255,0.85); margin-top: 8px;">Secure Electronic Voting Platform</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">Welcome, ${user.name}! 🎉</h2>
          <p style="color: #64748b; line-height: 1.6;">Your voter account has been created successfully. Here are your details:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #334155;"><strong>Name:</strong> ${user.name}</p>
            <p style="margin: 8px 0; color: #334155;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 8px 0; color: #334155;"><strong>Voter ID:</strong> <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: #5b5fc7; font-weight: 600;">${user.voterId}</code></p>
            <p style="margin: 8px 0; color: #334155;"><strong>Role:</strong> ${user.role}</p>
          </div>
          <p style="color: #64748b; font-size: 14px;">Keep your Voter ID safe — you can use it to verify your identity.</p>
        </div>
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">E-Vote System © ${new Date().getFullYear()} — Secure, Transparent, Democratic</p>
        </div>
      </div>
    `
  });
};

/**
 * Email: Vote Receipt
 */
const sendVoteReceipt = async (user, voteData) => {
  return sendEmail({
    to: user.email,
    subject: `✅ Vote Confirmed — ${voteData.electionTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center;">
          <div style="font-size: 48px;">✅</div>
          <h1 style="color: white; margin: 8px 0 0; font-size: 24px;">Vote Successfully Cast!</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #64748b; line-height: 1.6;">Dear ${user.name}, your vote has been securely recorded and added to the blockchain hash chain.</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #334155;"><strong>Election:</strong> ${voteData.electionTitle}</p>
            <p style="margin: 8px 0; color: #334155;"><strong>Voted For:</strong> <span style="color: #10b981; font-weight: 600;">${voteData.candidateName}</span></p>
            <p style="margin: 8px 0; color: #334155;"><strong>Timestamp:</strong> ${new Date(voteData.timestamp).toLocaleString()}</p>
          </div>
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              Your vote has been securely encrypted and recorded. Identity was verified via facial recognition.
            </p>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">E-Vote System © ${new Date().getFullYear()} — Your vote is encrypted and tamper-proof.</p>
        </div>
      </div>
    `
  });
};

/**
 * Email: OTP Verification
 */
const sendOTPEmail = async (user, otpCode, purpose = 'login') => {
  const purposeLabel = purpose === 'vote' ? 'Vote Confirmation' : 'Login Verification';
  return sendEmail({
    to: user.email,
    subject: `🔐 Your OTP for ${purposeLabel} — E-Vote System`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #5b5fc7, #8b5cf6); padding: 40px 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 ${purposeLabel}</h1>
        </div>
        <div style="padding: 30px; text-align: center;">
          <p style="color: #64748b; line-height: 1.6;">Hi ${user.name}, here is your one-time verification code:</p>
          <div style="background: white; border: 2px solid #5b5fc7; border-radius: 12px; padding: 30px; margin: 24px auto; max-width: 300px;">
            <p style="font-size: 36px; font-weight: 700; color: #5b5fc7; letter-spacing: 8px; margin: 0; font-family: monospace;">${otpCode}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; font-weight: 500;">⏰ This code expires in 5 minutes.</p>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">If you didn't request this code, please ignore this email.</p>
        </div>
        <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">E-Vote System © ${new Date().getFullYear()}</p>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendVoteReceipt,
  sendOTPEmail,
  getTransporter
};
