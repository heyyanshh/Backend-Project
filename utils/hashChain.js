const crypto = require('crypto');

/**
 * Create a SHA-256 hash for a vote record.
 * The hash includes the election ID, voter ID, candidate ID, timestamp, and the previous hash
 * to form a blockchain-like chain ensuring vote integrity.
 */
const createVoteHash = (voteData, previousHash) => {
  const { electionId, voterId, candidateId, timestamp } = voteData;
  const data = `${electionId}-${voterId}-${candidateId}-${timestamp}-${previousHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Verify the integrity of the entire vote chain for an election.
 * Each vote's hash is recalculated and compared with the stored hash.
 * If any vote has been tampered with, the chain breaks.
 */
const verifyChain = (votes) => {
  if (votes.length === 0) {
    return { isValid: true, brokenAt: null, message: 'No votes to verify.' };
  }

  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i];
    const expectedPreviousHash = i === 0 ? '0' : votes[i - 1].hash;

    // Verify previous hash link
    if (vote.previousHash !== expectedPreviousHash) {
      return {
        isValid: false,
        brokenAt: i,
        message: `Chain broken at vote index ${i}: previous hash mismatch.`
      };
    }

    // Recalculate and verify current hash
    const recalculatedHash = createVoteHash({
      electionId: vote.election.toString(),
      voterId: vote.voter.toString(),
      candidateId: vote.candidate.toString(),
      timestamp: vote.timestamp.toISOString()
    }, vote.previousHash);

    if (vote.hash !== recalculatedHash) {
      return {
        isValid: false,
        brokenAt: i,
        message: `Chain broken at vote index ${i}: vote hash has been tampered with.`
      };
    }
  }

  return {
    isValid: true,
    brokenAt: null,
    message: `All ${votes.length} votes verified. Chain integrity intact.`
  };
};

module.exports = { createVoteHash, verifyChain };
