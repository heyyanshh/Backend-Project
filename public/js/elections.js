// ─── Election Management Logic ───────────────────────────────────

let allElections = [];

(async function() {
  if (!requireAdmin()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('elections');
  await loadElections();
})();

async function loadElections() {
  try {
    const data = await api.get('/elections');
    allElections = data.data;

    document.getElementById('loading').classList.add('hidden');
    renderElections();
  } catch (error) {
    showToast('Failed to load elections', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
}

function renderElections() {
  const content = document.getElementById('elections-content');
  content.classList.remove('hidden');

  let electionsHtml = '';

  if (allElections.length === 0) {
    electionsHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No Elections</h3>
        <p class="empty-state-desc">Create your first election to get started.</p>
        <button onclick="showElectionModal()" class="btn-primary">Create Election</button>
      </div>
    `;
  } else {
    allElections.forEach((election, index) => {
      // Candidates list
      let candidatesHtml = '';
      if (election.candidates && election.candidates.length > 0) {
        candidatesHtml = election.candidates.map(c => `
          <div class="candidate-list-item">
            <div>
              <p class="candidate-list-name">${c.name}</p>
              <p class="candidate-list-party">${c.party}</p>
            </div>
            <div class="candidate-list-actions">
              <span class="candidate-list-votes">${c.voteCount || 0} votes</span>
              ${election.status === 'upcoming' ? `
                <button class="btn-icon" onclick="removeCandidate('${c._id}')" title="Remove">🗑️</button>
              ` : ''}
            </div>
          </div>
        `).join('');
      } else {
        candidatesHtml = '<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No candidates added yet.</p>';
      }

      // Actions
      let actionsHtml = '';
      if (election.status === 'upcoming') {
        actionsHtml = `
          <button onclick="changeStatus('${election._id}', 'active')" class="btn-success btn-sm">▶ Start Election</button>
        `;
      }
      if (election.status === 'active') {
        actionsHtml = `
          <button onclick="changeStatus('${election._id}', 'completed')" class="btn-danger btn-sm">⏹ End Election</button>
          <button onclick="verifyChain('${election._id}')" class="btn-secondary btn-sm">🛡️ Verify Chain</button>
        `;
      }
      if (election.status === 'completed') {
        actionsHtml = `
          <button onclick="verifyChain('${election._id}')" class="btn-secondary btn-sm">🛡️ Verify Chain Integrity</button>
          <a href="/results.html?id=${election._id}" class="btn-primary btn-sm">📊 View Results</a>
        `;
      }

      electionsHtml += `
        <div class="card-static election-manage-card animate-fade-in delay-${(index % 4) + 1}" style="margin-bottom: 20px;">
          <div class="election-manage-header">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${election.title}</h3>
              ${election.description ? `<p style="font-size: 0.85rem; color: var(--text-muted);">${election.description}</p>` : ''}
              <div class="election-manage-meta">
                <span>Start: ${new Date(election.startDate).toLocaleDateString()}</span>
                <span>End: ${new Date(election.endDate).toLocaleDateString()}</span>
                <span>Votes: ${election.totalVotes || 0}</span>
              </div>
            </div>
            <span class="badge badge-${election.status}">${election.status}</span>
          </div>

          <div class="mb-5">
            <div class="candidates-list-header">
              <h4 class="candidates-list-title">Candidates</h4>
              ${election.status === 'upcoming' ? `
                <button onclick="showCandidateModal('${election._id}')" style="font-size: 0.85rem; color: var(--primary-500); background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 500;">
                  ➕ Add Candidate
                </button>
              ` : ''}
            </div>
            ${candidatesHtml}
          </div>

          <div class="election-actions">
            ${actionsHtml}
          </div>
        </div>
      `;
    });
  }

  content.innerHTML = `
    <div class="flex items-center justify-between mb-8 flex-wrap gap-4 animate-slide-down">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Election Management</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Create, manage, and monitor elections</p>
      </div>
      <button onclick="showElectionModal()" class="btn-primary">➕ New Election</button>
    </div>
    ${electionsHtml}
  `;
}

// ─── Create Election Modal ───────────────────────────────────────
function showElectionModal() {
  const modal = document.getElementById('election-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <h3 class="modal-title">Create New Election</h3>
      <form id="create-election-form">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="el-title" class="input-field" placeholder="e.g. Student Body President 2024" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="el-desc" class="input-field" placeholder="Brief description of the election" rows="3"></textarea>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; overflow: hidden;" class="form-group">
          <div style="min-width: 0; overflow: hidden;">
            <label>Start Date</label>
            <input type="datetime-local" id="el-start" class="input-field" style="min-width:0; width:100%;" required>
          </div>
          <div style="min-width: 0; overflow: hidden;">
            <label>End Date</label>
            <input type="datetime-local" id="el-end" class="input-field" style="min-width:0; width:100%;" required>
          </div>
        </div>
        <div style="display: flex; gap: 10px; padding-top: 8px;">
          <button type="button" onclick="closeElectionModal()" class="btn-secondary" style="flex:1; min-width:0;">Cancel</button>
          <button type="submit" class="btn-primary" style="flex:1; min-width:0;">Create Election</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('create-election-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.post('/elections', {
        title: document.getElementById('el-title').value,
        description: document.getElementById('el-desc').value,
        startDate: new Date(document.getElementById('el-start').value).toISOString(),
        endDate: new Date(document.getElementById('el-end').value).toISOString()
      });
      showToast('Election created successfully!', 'success');
      closeElectionModal();
      await loadElections();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create election', 'error');
    }
  });
}

function closeElectionModal() {
  document.getElementById('election-modal').style.display = 'none';
}

// ─── Add Candidate Modal ─────────────────────────────────────────
function showCandidateModal(electionId) {
  const modal = document.getElementById('candidate-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <h3 class="modal-title">Add Candidate</h3>
      <form id="add-candidate-form">
        <div class="form-group">
          <label>Candidate Name</label>
          <input type="text" id="cand-name" class="input-field" placeholder="Full name" required>
        </div>
        <div class="form-group">
          <label>Party</label>
          <input type="text" id="cand-party" class="input-field" placeholder="Party / Independent" required>
        </div>
        <div class="form-group">
          <label>Manifesto (Optional)</label>
          <textarea id="cand-manifesto" class="input-field" placeholder="Key promises and vision" rows="3"></textarea>
        </div>
        <div class="flex gap-3" style="padding-top: 8px;">
          <button type="button" onclick="closeCandidateModal()" class="btn-secondary flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">Add Candidate</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('add-candidate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/candidates', {
        name: document.getElementById('cand-name').value,
        party: document.getElementById('cand-party').value,
        manifesto: document.getElementById('cand-manifesto').value,
        electionId
      });
      showToast('Candidate added successfully!', 'success');
      closeCandidateModal();
      await loadElections();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add candidate', 'error');
    }
  });
}

function closeCandidateModal() {
  document.getElementById('candidate-modal').style.display = 'none';
}

// ─── Status Changes ──────────────────────────────────────────────
async function changeStatus(electionId, newStatus) {
  try {
    await api.put(`/elections/${electionId}/status`, { status: newStatus });
    showToast(`Election ${newStatus === 'active' ? 'started' : 'completed'} successfully!`, 'success');
    await loadElections();
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to change status', 'error');
  }
}

// ─── Remove Candidate ────────────────────────────────────────────
async function removeCandidate(candidateId) {
  if (!confirm('Remove this candidate?')) return;
  try {
    await api.delete(`/admin/candidates/${candidateId}`);
    showToast('Candidate removed', 'success');
    await loadElections();
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to remove candidate', 'error');
  }
}

// ─── Verify Chain ────────────────────────────────────────────────
async function verifyChain(electionId) {
  try {
    const data = await api.get(`/votes/verify/${electionId}`);
    const result = data.data;
    if (result.isValid) {
      showToast(`✅ ${result.message}`, 'success');
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  } catch (error) {
    showToast('Chain verification failed', 'error');
  }
}
