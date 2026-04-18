const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const { createAuditLog, getClientIP } = require('../utils/helpers');

// @desc    Get all elections
// @route   GET /api/elections
// @access  Private
exports.getElections = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['upcoming', 'active', 'completed'].includes(status)) {
      filter.status = status;
    }

    const elections = await Election.find(filter)
      .populate('candidates', 'name party voteCount')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: elections.length,
      data: elections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve elections.'
    });
  }
};

// @desc    Get single election by ID
// @route   GET /api/elections/:id
// @access  Private
exports.getElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('candidates', 'name party manifesto voteCount')
      .populate('createdBy', 'name email');

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: election
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Could not retrieve election.'
    });
  }
};

// @desc    Create a new election
// @route   POST /api/elections
// @access  Private (Admin only)
exports.createElection = async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;

    const election = await Election.create({
      title,
      description,
      startDate,
      endDate,
      createdBy: req.user._id
    });

    await createAuditLog('ELECTION_CREATED', req.user._id, {
      electionId: election._id,
      title
    }, getClientIP(req));

    res.status(201).json({
      success: true,
      message: 'Election created successfully.',
      data: election
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create election.'
    });
  }
};

// @desc    Update an election
// @route   PUT /api/elections/:id
// @access  Private (Admin only)
exports.updateElection = async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;

    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    if (election.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a completed election.'
      });
    }

    const updated = await Election.findByIdAndUpdate(
      req.params.id,
      { title, description, startDate, endDate },
      { new: true, runValidators: true }
    ).populate('candidates', 'name party voteCount');

    await createAuditLog('ELECTION_UPDATED', req.user._id, {
      electionId: req.params.id,
      changes: { title, description }
    }, getClientIP(req));

    res.status(200).json({
      success: true,
      message: 'Election updated successfully.',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update election.'
    });
  }
};

// @desc    Change election status
// @route   PUT /api/elections/:id/status
// @access  Private (Admin only)
exports.changeElectionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['upcoming', 'active', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: upcoming, active, or completed.'
      });
    }

    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    // Validate status transitions
    const validTransitions = {
      upcoming: ['active'],
      active: ['completed'],
      completed: []
    };

    if (!validTransitions[election.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from '${election.status}' to '${status}'.`
      });
    }

    // Require at least 2 candidates to start an election
    if (status === 'active' && election.candidates.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'An election needs at least 2 candidates before it can be started.'
      });
    }

    election.status = status;
    await election.save();

    await createAuditLog('ELECTION_STATUS_CHANGED', req.user._id, {
      electionId: req.params.id,
      oldStatus: election.status,
      newStatus: status
    }, getClientIP(req));

    res.status(200).json({
      success: true,
      message: `Election status changed to '${status}'.`,
      data: election
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change election status.'
    });
  }
};
