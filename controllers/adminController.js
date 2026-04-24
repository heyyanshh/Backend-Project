const Candidate = require('../models/Candidate');
const Election = require('../models/Election');
const User = require('../models/User');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const { createAuditLog, getClientIP } = require('../utils/helpers');
const { getElectionAnalytics } = require('../utils/analytics');

// @desc    Add candidate to an election
// @route   POST /api/admin/candidates
// @access  Private (Admin only)
exports.addCandidate = async (req, res) => {
  try {
    const { name, party, manifesto, electionId } = req.body;

    // Check election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    if (election.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Candidates can only be added to upcoming elections.'
      });
    }

    // Create candidate
    const candidate = await Candidate.create({
      name,
      party,
      manifesto,
      election: electionId
    });

    // Add candidate to election's candidates array
    election.candidates.push(candidate._id);
    await election.save();

    await createAuditLog('CANDIDATE_ADDED', req.user._id, {
      candidateId: candidate._id,
      name,
      electionId
    }, getClientIP(req));

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('candidate_added', { electionId, candidate });
    }

    res.status(201).json({
      success: true,
      message: 'Candidate added successfully.',
      data: candidate
    });
  } catch (error) {
    console.error('Add candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add candidate.'
    });
  }
};

// @desc    Remove candidate from an election
// @route   DELETE /api/admin/candidates/:id
// @access  Private (Admin only)
exports.removeCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found.'
      });
    }

    // Check election status
    const election = await Election.findById(candidate.election);
    if (election && election.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove candidates from active or completed elections.'
      });
    }

    // Remove from election's candidates array
    if (election) {
      election.candidates = election.candidates.filter(
        c => c.toString() !== req.params.id
      );
      await election.save();
    }

    await Candidate.findByIdAndDelete(req.params.id);

    await createAuditLog('CANDIDATE_REMOVED', req.user._id, {
      candidateId: req.params.id,
      name: candidate.name,
      electionId: candidate.election
    }, getClientIP(req));

    res.status(200).json({
      success: true,
      message: 'Candidate removed successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove candidate.'
    });
  }
};

// @desc    Get election results
// @route   GET /api/admin/results/:electionId
// @access  Private
exports.getResults = async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId)
      .populate('candidates', 'name party voteCount');

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    // Only show results for completed or active elections
    if (election.status === 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Results are not available for upcoming elections.'
      });
    }

    // Sort candidates by vote count (descending)
    const results = election.candidates
      .map(c => ({
        id: c._id,
        name: c.name,
        party: c.party,
        voteCount: c.voteCount
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    const totalVotes = results.reduce((sum, c) => sum + c.voteCount, 0);

    res.status(200).json({
      success: true,
      data: {
        election: {
          id: election._id,
          title: election.title,
          status: election.status,
          totalVotes
        },
        results: results.map(r => ({
          ...r,
          percentage: totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(1) : '0.0'
        })),
        winner: election.status === 'completed' && results.length > 0 ? results[0] : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve results.'
    });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve audit logs.'
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalElections, totalVotes, activeElections] = await Promise.all([
      User.countDocuments({ role: 'voter' }),
      Election.countDocuments(),
      Vote.countDocuments(),
      Election.countDocuments({ status: 'active' })
    ]);

    const recentVotes = await Vote.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalElections,
        totalVotes,
        activeElections,
        recentVotes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve statistics.'
    });
  }
};

// @desc    Get AI-powered election analytics
// @route   GET /api/admin/analytics/:electionId
// @access  Private (Admin only)
exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await getElectionAnalytics(req.params.electionId);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not generate analytics.'
    });
  }
};
