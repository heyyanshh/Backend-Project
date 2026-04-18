const express = require('express');
const router = express.Router();
const {
  getElections,
  getElection,
  createElection,
  updateElection,
  changeElectionStatus
} = require('../controllers/electionController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { electionRules } = require('../middleware/validate');

// Protected routes (any authenticated user)
router.get('/', protect, getElections);
router.get('/:id', protect, getElection);

// Admin-only routes
router.post('/', protect, authorize('admin'), electionRules, createElection);
router.put('/:id', protect, authorize('admin'), updateElection);
router.put('/:id/status', protect, authorize('admin'), changeElectionStatus);

module.exports = router;
