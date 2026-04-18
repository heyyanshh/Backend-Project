const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  party: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: [50, 'Party name cannot exceed 50 characters']
  },
  manifesto: {
    type: String,
    trim: true,
    maxlength: [1000, 'Manifesto cannot exceed 1000 characters']
  },
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: [true, 'Election reference is required']
  },
  voteCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Candidate', candidateSchema);
