const Vote = require('../models/Vote');
const Election = require('../models/Election');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Generate AI-powered analytics insights for the admin dashboard
 */
const getElectionAnalytics = async (electionId) => {
  const election = await Election.findById(electionId).populate('candidates', 'name party voteCount');
  if (!election) return null;

  const votes = await Vote.find({ election: electionId }).sort({ timestamp: 1 });
  const totalRegisteredVoters = await User.countDocuments({ role: 'voter' });

  // ─── 1. Voter Turnout ────────────────────────────────────────────
  const turnoutPercentage = totalRegisteredVoters > 0
    ? ((votes.length / totalRegisteredVoters) * 100).toFixed(1)
    : '0.0';

  // ─── 2. Peak Voting Hours ─────────────────────────────────────────
  const hourCounts = {};
  votes.forEach(v => {
    const hour = new Date(v.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  let peakHour = null;
  let peakCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > peakCount) {
      peakHour = parseInt(hour);
      peakCount = count;
    }
  });

  const peakHourFormatted = peakHour !== null
    ? `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00`
    : 'N/A';

  // ─── 3. Voting Velocity (votes per hour over time) ────────────────
  const votingVelocity = [];
  if (votes.length > 0) {
    const startTime = new Date(votes[0].timestamp);
    const endTime = new Date(votes[votes.length - 1].timestamp);
    const totalHours = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60)));

    for (let h = 0; h < Math.min(totalHours, 24); h++) {
      const hourStart = new Date(startTime.getTime() + h * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const count = votes.filter(v => {
        const t = new Date(v.timestamp);
        return t >= hourStart && t < hourEnd;
      }).length;
      votingVelocity.push({
        hour: hourStart.toISOString(),
        label: `${hourStart.getHours().toString().padStart(2, '0')}:00`,
        count
      });
    }
  }

  // ─── 4. Candidate Margin Analysis ─────────────────────────────────
  const sortedCandidates = [...(election.candidates || [])].sort((a, b) => b.voteCount - a.voteCount);
  const leadMargin = sortedCandidates.length >= 2
    ? sortedCandidates[0].voteCount - sortedCandidates[1].voteCount
    : 0;

  const competitiveness = sortedCandidates.length >= 2
    ? leadMargin <= 2 ? 'Very Close Race' :
      leadMargin <= 5 ? 'Competitive' :
      leadMargin <= 10 ? 'Moderate Lead' : 'Dominant Lead'
    : 'N/A';

  // ─── 5. Voting Trend (cumulative over time) ───────────────────────
  const cumulativeVotes = [];
  votes.forEach((v, i) => {
    cumulativeVotes.push({
      timestamp: v.timestamp,
      total: i + 1,
      label: new Date(v.timestamp).toLocaleTimeString()
    });
  });

  // ─── 6. AI-Generated Insights ─────────────────────────────────────
  const insights = [];

  // Turnout insight
  const turnoutNum = parseFloat(turnoutPercentage);
  if (turnoutNum >= 75) {
    insights.push({ type: 'success', icon: '🎉', text: `Exceptional turnout at ${turnoutPercentage}%! This is a very well-participated election.` });
  } else if (turnoutNum >= 50) {
    insights.push({ type: 'info', icon: '📊', text: `Voter turnout is at ${turnoutPercentage}% — above average participation.` });
  } else if (turnoutNum >= 25) {
    insights.push({ type: 'warning', icon: '⚠️', text: `Voter turnout is at ${turnoutPercentage}% — consider sending reminders to boost participation.` });
  } else {
    insights.push({ type: 'danger', icon: '📉', text: `Low turnout at ${turnoutPercentage}%. Outreach efforts may be needed.` });
  }

  // Peak hours
  if (peakHour !== null) {
    insights.push({ type: 'info', icon: '⏰', text: `Peak voting activity was between ${peakHourFormatted} with ${peakCount} votes cast.` });
  }

  // Competition
  if (sortedCandidates.length >= 2) {
    insights.push({ type: 'info', icon: '🏁', text: `Race status: ${competitiveness}. Leading margin is ${leadMargin} vote${leadMargin !== 1 ? 's' : ''}.` });
  }

  // Voting speed
  if (votes.length > 0) {
    const firstVote = new Date(votes[0].timestamp);
    const lastVote = new Date(votes[votes.length - 1].timestamp);
    const durationHrs = ((lastVote - firstVote) / (1000 * 60 * 60)).toFixed(1);
    const avgRate = durationHrs > 0 ? (votes.length / parseFloat(durationHrs)).toFixed(1) : votes.length;
    insights.push({ type: 'info', icon: '⚡', text: `Average voting rate: ${avgRate} votes/hour over ${durationHrs} hours.` });
  }

  return {
    election: {
      id: election._id,
      title: election.title,
      status: election.status,
      totalVotes: votes.length
    },
    turnout: {
      percentage: turnoutPercentage,
      totalVoters: totalRegisteredVoters,
      totalVotes: votes.length
    },
    peakVoting: {
      hour: peakHourFormatted,
      count: peakCount,
      distribution: hourCounts
    },
    votingVelocity,
    cumulativeVotes: cumulativeVotes.length > 100
      ? cumulativeVotes.filter((_, i) => i % Math.ceil(cumulativeVotes.length / 100) === 0)
      : cumulativeVotes,
    candidateAnalysis: {
      leadMargin,
      competitiveness,
      candidates: sortedCandidates.map(c => ({
        name: c.name,
        party: c.party,
        voteCount: c.voteCount,
        percentage: votes.length > 0 ? ((c.voteCount / votes.length) * 100).toFixed(1) : '0.0'
      }))
    },
    insights
  };
};

module.exports = { getElectionAnalytics };
