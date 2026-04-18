// ─── Voting Page Logic ───────────────────────────────────────────

let selectedCandidate = null;
let currentElection = null;

(async function() {
  if (!requireVoter()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('vote');
  
  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');
  if (!electionId) { window.location.href = '/dashboard.html'; return; }

  try {
    // Check if already voted
    const statusData = await api.get(`/votes/status/${electionId}`);
    if (statusData.data.hasVoted) {
      showToast('You have already voted in this election', 'error');
      window.location.href = '/dashboard.html';
      return;
    }

    // Get election details
    const electionData = await api.get(`/elections/${electionId}`);
    currentElection = electionData.data;

    if (currentElection.status !== 'active') {
      showToast('This election is not currently active', 'error');
      window.location.href = '/dashboard.html';
      return;
    }

    document.getElementById('loading').classList.add('hidden');
    renderVotingPage();
  } catch (error) {
    showToast('Failed to load election', 'error');
    window.location.href = '/dashboard.html';
  }
})();

function renderVotingPage() {
  const content = document.getElementById('voting-content');
  content.classList.remove('hidden');

  const candidateColors = ['#5b5fc7', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#a78bfa'];

  let candidatesHtml = '';
  currentElection.candidates.forEach((candidate, index) => {
    const color1 = candidateColors[index % candidateColors.length];
    const color2 = candidateColors[(index + 1) % candidateColors.length];

    candidatesHtml += `
      <div class="candidate-card animate-fade-in delay-${(index % 4) + 1}" 
           id="candidate-${candidate._id}" 
           onclick="selectCandidate('${candidate._id}', '${candidate.name}', '${candidate.party}')">
        <span class="check-icon">✓</span>
        <div class="candidate-avatar" style="background: linear-gradient(135deg, ${color1}, ${color2});">
          ${candidate.name.charAt(0)}
        </div>
        <h3 class="candidate-name">${candidate.name}</h3>
        <p class="candidate-party">${candidate.party}</p>
        ${candidate.manifesto ? `<p class="candidate-manifesto">${candidate.manifesto}</p>` : ''}
      </div>
    `;
  });

  content.innerHTML = `
    <div class="animate-slide-down mb-8">
      <a href="/dashboard.html" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; text-decoration: none;">
        ← Back to Dashboard
      </a>
      <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${currentElection.title}</h1>
      ${currentElection.description ? `<p style="color: var(--text-muted); font-size: 0.9rem;">${currentElection.description}</p>` : ''}
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
        <span style="color: var(--primary-500);">🛡️</span>
        <p style="font-size: 0.825rem; color: var(--primary-500);">Your vote is encrypted and securely chained</p>
      </div>
    </div>
    <div class="candidates-grid mb-8">
      ${candidatesHtml}
    </div>
    <div id="vote-button-area" class="text-center hidden"></div>
  `;
}

function selectCandidate(id, name, party) {
  // Remove previous selection
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Select new
  document.getElementById(`candidate-${id}`).classList.add('selected');
  selectedCandidate = { _id: id, name, party };

  // Show vote button
  const btnArea = document.getElementById('vote-button-area');
  btnArea.classList.remove('hidden');
  btnArea.innerHTML = `
    <button onclick="showConfirmModal()" class="btn-primary" style="font-size: 1rem; padding: 14px 40px;">
      Confirm Vote for ${name}
    </button>
  `;
}

function showConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <h3 class="modal-title">Confirm Your Vote</h3>
      <p style="color: var(--text-muted); margin-bottom: 20px;">
        You are about to vote for <span style="color: var(--primary-500); font-weight: 600;">${selectedCandidate.name}</span> (${selectedCandidate.party}).
        This action cannot be undone.
      </p>
      <div class="warning-box">
        ⚠️ Once submitted, your vote is final and cannot be changed.
      </div>
      <div class="flex gap-3">
        <button onclick="closeModal()" class="btn-secondary flex-1">Cancel</button>
        <button onclick="submitVote()" id="submit-vote-btn" class="btn-success flex-1">
          ✓ Confirm Vote
        </button>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('confirm-modal').style.display = 'none';
}

async function submitVote() {
  const btn = document.getElementById('submit-vote-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div> Submitting...';

  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');

  try {
    const data = await api.post('/votes', {
      electionId,
      candidateId: selectedCandidate._id
    });

    closeModal();
    showToast('Vote cast successfully!', 'success');

    // Show success receipt
    document.getElementById('voting-content').classList.add('hidden');
    const successDiv = document.getElementById('vote-success');
    successDiv.classList.remove('hidden');
    successDiv.style.display = 'flex';
    successDiv.innerHTML = `
      <div class="card vote-receipt animate-scale-in">
        <div class="receipt-icon">✓</div>
        <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Vote Recorded!</h2>
        <p style="color: var(--text-muted); margin-bottom: 20px;">
          Your vote for <span style="color: var(--primary-500); font-weight: 500;">${currentElection.title}</span> has been securely recorded.
        </p>
        <div class="receipt-hash">
          <p class="receipt-hash-label">Vote Hash (Blockchain Proof)</p>
          <p class="receipt-hash-value">${data.data.voteHash}</p>
          <p class="receipt-hash-label" style="margin-top: 10px;">Timestamp</p>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${new Date(data.data.timestamp).toLocaleString()}</p>
        </div>
        <div class="flex gap-3">
          <a href="/dashboard.html" class="btn-secondary flex-1">Back to Dashboard</a>
          <a href="/results.html?id=${electionId}" class="btn-primary flex-1">View Results</a>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to cast vote', 'error');
    closeModal();
  }
}
