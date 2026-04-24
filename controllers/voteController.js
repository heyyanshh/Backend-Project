const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { createVoteHash, verifyChain } = require('../utils/hashChain');
const { createAuditLog, getClientIP } = require('../utils/helpers');
const { sendVoteReceipt } = require('../utils/emailService');

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
    const timestampISO = timestamp.toISOString();

    // 5. Create the hash for this vote
    const hash = createVoteHash({
      electionId: electionId.toString(),
      voterId: voterId.toString(),
      candidateId: candidateId.toString(),
      timestamp: timestampISO
    }, previousHash);

    // 6. Create the vote record
    const vote = await Vote.create({
      election: electionId,
      voter: voterId,
      candidate: candidateId,
      previousHash,
      hash,
      timestamp,
      timestampISO
    });

    // 7. Increment candidate vote count and election total
    await Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } });
    await Election.findByIdAndUpdate(electionId, { $inc: { totalVotes: 1 } });

    // 8. Audit log
    await createAuditLog('VOTE_CAST', voterId, {
      electionId,
      voteHash: hash
    }, getClientIP(req));

    // 9. Send vote receipt email (non-blocking)
    const voter = await User.findById(voterId);
    if (voter) {
      const candidateDetails = await Candidate.findById(candidateId);
      sendVoteReceipt(voter, {
        electionTitle: election.title,
        candidateName: candidateDetails ? candidateDetails.name : 'Unknown Candidate',
        voteHash: hash,
        timestamp: vote.timestamp
      }).catch(err => console.error('Vote receipt email failed:', err.message));
    }

    // 10. Emit real-time event via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Get updated candidate info
      const updatedCandidate = await Candidate.findById(candidateId);
      const updatedElection = await Election.findById(electionId).populate('candidates', 'name party voteCount');
      
      io.emit('vote_cast', {
        electionId,
        electionTitle: election.title,
        totalVotes: updatedElection.totalVotes,
        candidates: updatedElection.candidates,
        timestamp: vote.timestamp
      });

      io.emit('audit_log', {
        action: 'VOTE_CAST',
        details: { electionId, voteHash: hash },
        timestamp: vote.timestamp
      });
    }

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
    }).populate('candidate', 'name party');

    res.status(200).json({
      success: true,
      data: {
        hasVoted: !!vote,
        votedAt: vote ? vote.timestamp : null,
        voteHash: vote ? vote.hash : null,
        candidateName: vote && vote.candidate ? vote.candidate.name : null,
        candidateParty: vote && vote.candidate ? vote.candidate.party : null
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

// @desc    Public vote hash verification (no auth required)
// @route   POST /api/votes/public-verify
// @access  Public
exports.publicVerifyVote = async (req, res) => {
  try {
    const { voteHash } = req.body;

    if (!voteHash || voteHash.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 64-character SHA-256 vote hash.'
      });
    }

    const vote = await Vote.findOne({ hash: voteHash })
      .populate('election', 'title status')
      .populate('candidate', 'name party');

    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'No vote found with this hash. It may be invalid or the vote may not exist.',
        data: { exists: false }
      });
    }

    // Verify the hash integrity (recalculate)
    // Use the stored timestampISO if available, otherwise fallback to timestamp.toISOString()
    const tsString = vote.timestampISO || vote.timestamp.toISOString();

    const recalculatedHash = createVoteHash({
      electionId: vote.election._id.toString(),
      voterId: vote.voter.toString(),
      candidateId: vote.candidate.toString(),
      timestamp: tsString
    }, vote.previousHash);

    const isIntact = recalculatedHash === vote.hash;

    res.status(200).json({
      success: true,
      message: isIntact
        ? '✅ Vote verified! This vote exists and has NOT been tampered with.'
        : '❌ WARNING: Vote hash mismatch detected. The vote record may have been altered.',
      data: {
        exists: true,
        isIntact,
        electionTitle: vote.election.title,
        electionStatus: vote.election.status,
        candidateName: vote.candidate ? vote.candidate.name : 'Unknown',
        candidateParty: vote.candidate ? vote.candidate.party : '',
        timestamp: vote.timestamp,
        hashChainValid: isIntact
      }
    });
  } catch (error) {
    console.error('Public verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

// @desc    Export election results as JSON (for PDF/CSV generation)
// @route   GET /api/votes/export/:electionId
// @access  Private (Admin only)
exports.exportResults = async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId)
      .populate('candidates', 'name party voteCount');

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found.' });
    }

    const votes = await Vote.find({ election: req.params.electionId })
      .sort({ timestamp: 1 });

    const totalRegisteredVoters = await User.countDocuments({ role: 'voter' });
    const totalVotes = votes.length;
    const turnout = totalRegisteredVoters > 0
      ? ((totalVotes / totalRegisteredVoters) * 100).toFixed(1)
      : '0.0';

    const sortedCandidates = [...election.candidates]
      .sort((a, b) => b.voteCount - a.voteCount)
      .map(c => ({
        name: c.name,
        party: c.party,
        voteCount: c.voteCount,
        percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0.0'
      }));

    const winner = election.status === 'completed' && sortedCandidates.length > 0
      ? sortedCandidates[0]
      : null;

    // Format for export
    const format = req.query.format || 'json';

    if (format === 'csv') {
      let csv = 'Rank,Candidate,Party,Votes,Percentage\n';
      sortedCandidates.forEach((c, i) => {
        csv += `${i + 1},"${c.name}","${c.party}",${c.voteCount},${c.percentage}%\n`;
      });
      csv += `\nTotal Votes,${totalVotes}\n`;
      csv += `Voter Turnout,${turnout}%\n`;
      csv += `Election Status,${election.status}\n`;
      if (winner) csv += `Winner,${winner.name}\n`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${election.title.replace(/[^a-z0-9]/gi, '_')}_results.csv"`);
      return res.send(csv);
    }

    res.status(200).json({
      success: true,
      data: {
        election: {
          title: election.title,
          status: election.status,
          startDate: election.startDate,
          endDate: election.endDate
        },
        results: sortedCandidates,
        summary: {
          totalVotes,
          totalRegisteredVoters,
          turnout: `${turnout}%`,
          winner
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export results.'
    });
  }
};
