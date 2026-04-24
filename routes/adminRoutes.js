const express = require('express');
const router = express.Router();
const {
  addCandidate,
  removeCandidate,
  getResults,
  getAuditLogs,
  getStats,
  getAnalytics
} = require('../controllers/adminController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { candidateRules } = require('../middleware/validate');

// Results route (any authenticated user can view results)
router.get('/results/:electionId', protect, getResults);

// Admin-only routes
router.post('/candidates', protect, authorize('admin'), candidateRules, addCandidate);
router.delete('/candidates/:id', protect, authorize('admin'), removeCandidate);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.get('/stats', protect, authorize('admin'), getStats);
router.get('/analytics/:electionId', protect, authorize('admin'), getAnalytics);

module.exports = router;
