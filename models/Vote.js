const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: [true, 'Election reference is required']
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Voter reference is required']
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'Candidate reference is required']
  },
  previousHash: {
    type: String,
    required: true,
    default: '0'
  },
  hash: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  timestampISO: {
    type: String
  }
}, {
  timestamps: true
});

// Unique compound index — enforces one vote per user per election
voteSchema.index({ voter: 1, election: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
