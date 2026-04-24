// ─── Admin Dashboard Logic ───────────────────────────────────────

(async function() {
  if (!requireAdmin()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('dashboard');

  try {
    const [statsRes, electionsRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/elections')
    ]);

    const stats = statsRes.data;
    const elections = electionsRes.data;

    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('admin-content');
    content.classList.remove('hidden');

    // Build elections table rows
    let tableRows = '';
    elections.slice(0, 5).forEach(election => {
      tableRows += `
        <tr>
          <td style="color: var(--text-primary); font-weight: 500;">${election.title}</td>
          <td><span class="badge badge-${election.status}">${election.status}</span></td>
          <td style="color: var(--text-secondary);">${election.candidates?.length || 0}</td>
          <td style="color: var(--text-primary); font-weight: 600;">${election.totalVotes || 0}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${new Date(election.endDate).toLocaleDateString()}</td>
          <td>
            <a href="/results.html?id=${election._id}" style="color: var(--primary-500); font-size: 0.85rem; font-weight: 500;">Results →</a>
          </td>
        </tr>
      `;
    });

    let electionsTable = '';
    if (elections.length === 0) {
      electionsTable = `
        <div style="padding: 40px; text-align: center;">
          <div style="font-size: 2.5rem; color: var(--gray-300); margin-bottom: 12px;">⏱</div>
          <p style="color: var(--text-muted);">No elections created yet.</p>
          <a href="/elections.html" class="btn-primary mt-4" style="display: inline-flex;">Create First Election</a>
        </div>
      `;
    } else {
      electionsTable = `
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Candidates</th><th>Total Votes</th><th>End Date</th><th>Actions</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="animate-slide-down mb-8">
        <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
          Admin <span class="gradient-text">Dashboard</span>
        </h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Manage elections, monitor votes, and ensure election integrity.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card animate-fade-in delay-1">
          <div class="stat-icon" style="background: var(--primary-50);">
            <span style="color: var(--primary-500); font-size: 1.35rem;">👥</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${stats.totalUsers ?? '—'}</p>
            <p class="stat-label">Total Voters</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-2">
          <div class="stat-icon" style="background: var(--accent-50);">
            <span style="color: var(--accent-500); font-size: 1.35rem;">📋</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${stats.totalElections ?? '—'}</p>
            <p class="stat-label">Total Elections</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-3">
          <div class="stat-icon" style="background: var(--success-50);">
            <span style="color: var(--success-500); font-size: 1.35rem;">✓</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${stats.totalVotes ?? '—'}</p>
            <p class="stat-label">Total Votes Cast</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-4">
          <div class="stat-icon" style="background: var(--warning-50);">
            <span style="color: var(--warning-500); font-size: 1.35rem;">⚡</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${stats.recentVotes ?? '—'}</p>
            <p class="stat-label">Votes (24h)</p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 mb-8 animate-fade-in delay-5">
        <a href="/elections.html" class="btn-primary">📋 Manage Elections</a>
        <a href="/analytics.html" class="btn-secondary">🤖 AI Analytics</a>
        <a href="/audit.html" class="btn-secondary">🔍 View Audit Logs</a>
      </div>

      <div class="card-static animate-fade-in delay-6" style="overflow: hidden;">
        <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
          <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">Recent Elections</h3>
          <a href="/elections.html" style="font-size: 0.85rem; color: var(--primary-500); font-weight: 500;">View All →</a>
        </div>
        ${electionsTable}
      </div>
    `;
  } catch (error) {
    showToast('Failed to load dashboard data', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
})();
