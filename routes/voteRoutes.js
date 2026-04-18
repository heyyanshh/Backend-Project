const express = require('express');
const router = express.Router();
const { castVote, checkVoteStatus, verifyVoteChain } = require('../controllers/voteController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { voteRules } = require('../middleware/validate');
const { voteLimiter } = require('../middleware/rateLimiter');

// Voter routes
router.post('/', protect, authorize('voter'), voteLimiter, voteRules, castVote);
router.get('/status/:electionId', protect, checkVoteStatus);

// Admin route — verify chain integrity
router.get('/verify/:electionId', protect, authorize('admin'), verifyVoteChain);

module.exports = router;
