const express = require('express');
const router = express.Router();
const { castVote, checkVoteStatus, verifyVoteChain, publicVerifyVote, exportResults } = require('../controllers/voteController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { voteRules } = require('../middleware/validate');
const { voteLimiter } = require('../middleware/rateLimiter');

// PUBLIC route — verify vote hash (no login required)
router.post('/public-verify', publicVerifyVote);

// Voter routes
router.post('/', protect, authorize('voter'), voteLimiter, voteRules, castVote);
router.get('/status/:electionId', protect, checkVoteStatus);

// Admin routes
router.get('/verify/:electionId', protect, authorize('admin'), verifyVoteChain);
router.get('/export/:electionId', protect, authorize('admin'), exportResults);

module.exports = router;
