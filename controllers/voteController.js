const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const { createVoteHash, verifyChain } = require('../utils/hashChain');
const { createAuditLog, getClientIP } = require('../utils/helpers');

// @desc    Cast a vote
// @route   POST /api/votes
// @access  Private (Voter only)
exports.castVote = async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    const voterId = req.user._id;

    // 1. Check election exists and is active
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This election is currently '${election.status}'. Voting is only allowed during active elections.`
      });
    }

    // 2. Check candidate exists and belongs to this election
    const candidate = await Candidate.findById(candidateId);
    if (!candidate || candidate.election.toString() !== electionId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate for this election.'
      });
    }

    // 3. Check if user has already voted (duplicate prevention)
    const existingVote = await Vote.findOne({ voter: voterId, election: electionId });
    if (existingVote) {
      await createAuditLog('DUPLICATE_VOTE_ATTEMPT', voterId, {
        electionId,
        candidateId
      }, getClientIP(req));

      return res.status(400).json({
        success: false,
        message: 'You have already cast your vote in this election. Each voter can only vote once.'
      });
    }

    // 4. Get the last vote in the chain for this election
    const lastVote = await Vote.findOne({ election: electionId })
      .sort({ timestamp: -1 })
      .limit(1);

    const previousHash = lastVote ? lastVote.hash : '0';
    const timestamp = new Date();

    // 5. Create the hash for this vote
    const hash = createVoteHash({
      electionId: electionId.toString(),
      voterId: voterId.toString(),
      candidateId: candidateId.toString(),
      timestamp: timestamp.toISOString()
    }, previousHash);

    // 6. Create the vote record
    const vote = await Vote.create({
      election: electionId,
      voter: voterId,
      candidate: candidateId,
      previousHash,
      hash,
      timestamp
    });

    // 7. Increment candidate vote count and election total
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });
    await Election.findByIdAndUpdate(electionId, { $inc: { totalVotes: 1 } });

    // 8. Audit log
    await createAuditLog('VOTE_CAST', voterId, {
      electionId,
      voteHash: hash
    }, getClientIP(req));

    res.status(201).json({
      success: true,
      message: 'Your vote has been cast successfully and securely recorded.',
      data: {
        voteHash: hash,
        timestamp: vote.timestamp,
        electionTitle: election.title
      }
    });
  } catch (error) {
    // Handle unique index violation (duplicate vote via race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election.'
      });
    }
    console.error('Vote casting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cast vote. Please try again.'
    });
  }
};

// @desc    Check if user has voted in an election
// @route   GET /api/votes/status/:electionId
// @access  Private
exports.checkVoteStatus = async (req, res) => {
  try {
    const vote = await Vote.findOne({
      voter: req.user._id,
      election: req.params.electionId
    });

    res.status(200).json({
      success: true,
      data: {
        hasVoted: !!vote,
        votedAt: vote ? vote.timestamp : null,
        voteHash: vote ? vote.hash : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not check vote status.'
    });
  }
};

// @desc    Verify hash chain integrity for an election
// @route   GET /api/votes/verify/:electionId
// @access  Private (Admin only)
exports.verifyVoteChain = async (req, res) => {
  try {
    const votes = await Vote.find({ election: req.params.electionId })
      .sort({ timestamp: 1 });

    const result = verifyChain(votes);

    // Audit log
    await createAuditLog('CHAIN_VERIFIED', req.user._id, {
      electionId: req.params.electionId,
      isValid: result.isValid,
      totalVotes: votes.length
    }, getClientIP(req));

    res.status(200).json({
      success: true,
      data: {
        ...result,
        totalVotes: votes.length,
        electionId: req.params.electionId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Chain verification failed.'
    });
  }
};
