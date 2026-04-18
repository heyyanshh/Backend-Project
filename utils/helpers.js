const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 */
const createAuditLog = async (action, userId, details = {}, ipAddress = 'unknown') => {
  try {
    await AuditLog.create({
      action,
      userId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
};

module.exports = { createAuditLog, getClientIP };
