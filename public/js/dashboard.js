// ─── Voter Dashboard Logic ───────────────────────────────────────

(async function() {
  if (!requireVoter()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('dashboard');
  const user = getCurrentUser();

  // Render welcome header
  document.getElementById('welcome-header').innerHTML = `
    <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
      Welcome back, <span class="gradient-text">${user.name}</span> 👋
    </h1>
    <p style="color: var(--text-muted); font-size: 0.9rem;">
      Voter ID: <span style="color: var(--primary-500); font-family: monospace; font-weight: 500;">${user.voterId}</span> · Your vote, your voice
    </p>
  `;

  try {
    // Fetch elections
    const electionsData = await api.get('/elections');
    const elections = electionsData.data;

    // Check vote statuses
    const voteStatuses = {};
    for (const election of elections) {
      try {
        const statusData = await api.get(`/votes/status/${election._id}`);
        voteStatuses[election._id] = statusData.data;
      } catch (e) {
        voteStatuses[election._id] = { hasVoted: false };
      }
    }

    // Categorize elections
    const active = elections.filter(e => e.status === 'active');
    const upcoming = elections.filter(e => e.status === 'upcoming');
    const completed = elections.filter(e => e.status === 'completed');

    // Render stats
    document.getElementById('stats-section').innerHTML = `
      <div class="stat-card animate-fade-in delay-1">
        <div class="stat-icon" style="background: var(--success-50);">
          <span style="color: var(--success-500);">✓</span>
        </div>
        <div class="stat-info">
          <p class="stat-value">${active.length}</p>
          <p class="stat-label">Active Elections</p>
        </div>
      </div>
      <div class="stat-card animate-fade-in delay-2">
        <div class="stat-icon" style="background: var(--warning-50);">
          <span style="color: var(--warning-500);">⏱</span>
        </div>
        <div class="stat-info">
          <p class="stat-value">${upcoming.length}</p>
          <p class="stat-label">Upcoming</p>
        </div>
      </div>
      <div class="stat-card animate-fade-in delay-3">
        <div class="stat-icon" style="background: var(--primary-50);">
          <span style="color: var(--primary-500);">📊</span>
        </div>
        <div class="stat-info">
          <p class="stat-value">${completed.length}</p>
          <p class="stat-label">Completed</p>
        </div>
      </div>
    `;

    // Hide loading, show content
    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('elections-content');
    content.classList.remove('hidden');

    let html = '';

    // Render election sections
    if (active.length > 0) {
      html += renderElectionSection('Active Elections', active, voteStatuses, 'active', 'var(--success-500)');
    }
    if (upcoming.length > 0) {
      html += renderElectionSection('Upcoming Elections', upcoming, voteStatuses, 'upcoming', 'var(--warning-500)');
    }
    if (completed.length > 0) {
      html += renderElectionSection('Completed Elections', completed, voteStatuses, 'completed', 'var(--primary-500)');
    }

    if (elections.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3 class="empty-state-title">No Elections Yet</h3>
          <p class="empty-state-desc">Check back later for upcoming elections.</p>
        </div>
      `;
    }

    content.innerHTML = html;
  } catch (error) {
    showToast('Failed to load elections', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
})();

function renderElectionSection(title, elections, voteStatuses, status, dotColor) {
  const icon = status === 'active' ? `<div class="section-dot" style="background: ${dotColor};"></div>` : 
    status === 'upcoming' ? '⏱' : '📊';

  let cards = '';
  elections.forEach((election, i) => {
    const vs = voteStatuses[election._id];
    const hasVoted = vs?.hasVoted;
    const isActive = election.status === 'active';
    const isCompleted = election.status === 'completed';

    let votedHtml = '';
    if (hasVoted) {
      votedHtml = `
        <div class="voted-badge">
          <span>✓</span> Vote Cast Successfully
        </div>
      `;
    }

    let actionsHtml = '';
    if (isActive && !hasVoted) {
      actionsHtml = `<a href="/vote.html?id=${election._id}" class="btn-primary btn-sm flex-1 text-center" style="text-decoration:none;">Cast Your Vote</a>`;
    }
    if ((isCompleted || (isActive && hasVoted))) {
      actionsHtml += `<a href="/results.html?id=${election._id}" class="btn-secondary btn-sm flex-1 text-center" style="text-decoration:none;">View Results</a>`;
    }
    if (!isActive && !isCompleted) {
      actionsHtml = `<span class="text-sm" style="color: var(--text-muted); padding: 10px 0;">Voting not yet started</span>`;
    }

    cards += `
      <div class="card animate-fade-in delay-${(i % 4) + 1}" style="padding: 20px;">
        <div class="election-card-header">
          <div style="flex: 1;">
            <h3 class="election-card-title">${election.title}</h3>
            ${election.description ? `<p class="election-card-desc">${election.description}</p>` : ''}
          </div>
          <span class="badge badge-${election.status}" style="margin-left: 12px;">${election.status}</span>
        </div>
        <div class="election-card-meta">
          <span>👥 ${election.candidates?.length || 0} candidates</span>
          <span>📅 ${new Date(election.endDate).toLocaleDateString()}</span>
        </div>
        ${votedHtml}
        <div class="election-card-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  });

  return `
    <section class="mb-8">
      <div class="section-header">
        ${typeof icon === 'string' && icon.startsWith('<') ? icon : `<span style="font-size: 1.15rem;">${icon}</span>`}
        <h2 class="section-title">${title}</h2>
      </div>
      <div class="elections-grid">
        ${cards}
      </div>
    </section>
  `;
}
