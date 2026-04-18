const { body, param, validationResult } = require('express-validator');

// Middleware to check validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation rules
const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
  handleValidation
];

// Login validation rules
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidation
];

// Election creation validation
const electionRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Election title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid date format'),
  handleValidation
];

// Vote casting validation
const voteRules = [
  body('electionId')
    .notEmpty().withMessage('Election ID is required')
    .isMongoId().withMessage('Invalid election ID'),
  body('candidateId')
    .notEmpty().withMessage('Candidate ID is required')
    .isMongoId().withMessage('Invalid candidate ID'),
  handleValidation
];

// Candidate creation validation
const candidateRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Candidate name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('party')
    .trim()
    .notEmpty().withMessage('Party name is required')
    .isLength({ max: 50 }).withMessage('Party name cannot exceed 50 characters'),
  body('manifesto')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Manifesto cannot exceed 1000 characters'),
  body('electionId')
    .notEmpty().withMessage('Election ID is required')
    .isMongoId().withMessage('Invalid election ID'),
  handleValidation
];

// MongoDB ObjectId param validation
const mongoIdParam = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidation
];

module.exports = {
  registerRules,
  loginRules,
  electionRules,
  voteRules,
  candidateRules,
  mongoIdParam,
  handleValidation
};
