// ─── AI-Powered Analytics Dashboard Logic ────────────────────────

(async function() {
  if (!requireAdmin()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('analytics');

  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');

  if (!electionId) {
    // Show election picker
    try {
      const electionsData = await api.get('/elections');
      const elections = electionsData.data.filter(e => e.status !== 'upcoming');

      document.getElementById('loading').classList.add('hidden');
      const content = document.getElementById('analytics-content');
      content.classList.remove('hidden');

      if (elections.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <h3 class="empty-state-title">No Analytics Available</h3>
            <p class="empty-state-desc">Analytics are available once elections are active or completed.</p>
            <a href="/elections.html" class="btn-primary">Manage Elections</a>
          </div>
        `;
        return;
      }

      let cardsHtml = '';
      elections.forEach((el, i) => {
        cardsHtml += `
          <a href="/analytics.html?id=${el._id}" class="card animate-fade-in delay-${(i % 4) + 1}" style="padding: 20px; text-decoration: none; display: block; cursor: pointer;">
            <div class="election-card-header">
              <div style="flex: 1;">
                <h3 class="election-card-title">${el.title}</h3>
                ${el.description ? `<p class="election-card-desc">${el.description}</p>` : ''}
              </div>
              <span class="badge badge-${el.status}">${el.status}</span>
            </div>
            <div class="election-card-meta">
              <span>📊 ${el.totalVotes || 0} total votes</span>
              <span>👥 ${el.candidates?.length || 0} candidates</span>
            </div>
            <div style="margin-top: 12px;">
              <span style="color: var(--primary-500); font-size: 0.85rem; font-weight: 500;">View Analytics →</span>
            </div>
          </a>
        `;
      });

      content.innerHTML = `
        <div class="animate-slide-down mb-8">
          <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
            🤖 AI-Powered <span class="gradient-text">Analytics</span>
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Select an election to view intelligent insights and trends</p>
        </div>
        <div class="elections-grid">
          ${cardsHtml}
        </div>
      `;
    } catch (error) {
      showToast('Failed to load elections', 'error');
      document.getElementById('loading').classList.add('hidden');
    }
    return;
  }

  // Load analytics for specific election
  try {
    const response = await api.get(`/admin/analytics/${electionId}`);
    const data = response.data;

    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('analytics-content');
    content.classList.remove('hidden');

    // Build insights cards
    let insightsHtml = '';
    data.insights.forEach((insight, i) => {
      const bgColors = {
        success: 'var(--success-50)',
        info: 'var(--primary-50)',
        warning: 'var(--warning-50)',
        danger: 'rgba(239, 68, 68, 0.08)'
      };
      const textColors = {
        success: 'var(--success-500)',
        info: 'var(--primary-500)',
        warning: 'var(--warning-500)',
        danger: 'var(--danger-500)'
      };
      insightsHtml += `
        <div class="card animate-fade-in delay-${(i % 4) + 1}" style="padding: 16px; border-left: 4px solid ${textColors[insight.type] || 'var(--primary-500)'};">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 1.3rem;">${insight.icon}</span>
            <p style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.5; margin: 0;">${insight.text}</p>
          </div>
        </div>
      `;
    });

    // Candidate analysis table
    let candidateRows = '';
    data.candidateAnalysis.candidates.forEach((c, i) => {
      candidateRows += `
        <tr>
          <td style="font-weight: 500; color: var(--text-primary);">#${i + 1}</td>
          <td style="color: var(--text-primary); font-weight: 500;">${c.name}</td>
          <td style="color: var(--text-secondary);">${c.party}</td>
          <td style="color: var(--text-primary); font-weight: 600;">${c.voteCount}</td>
          <td style="color: var(--primary-500); font-weight: 500;">${c.percentage}%</td>
        </tr>
      `;
    });

    // Export buttons
    const exportBtns = `
      <div class="flex flex-wrap gap-3">
        <button onclick="exportCSV('${electionId}')" class="btn-secondary btn-sm">📄 Export CSV</button>
        <button onclick="exportPDF()" class="btn-secondary btn-sm">📋 Export PDF</button>
        <a href="/results.html?id=${electionId}" class="btn-primary btn-sm" style="text-decoration:none;">📊 Full Results</a>
      </div>
    `;

    content.innerHTML = `
      <div class="animate-slide-down mb-8">
        <a href="/analytics.html" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; text-decoration: none;">
          ← Back to Elections
        </a>
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
              🤖 Analytics: <span class="gradient-text">${data.election.title}</span>
            </h1>
            <p style="color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
              <span class="badge badge-${data.election.status}">${data.election.status}</span>
              · ${data.election.totalVotes} total votes
            </p>
          </div>
          ${exportBtns}
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="stats-grid mb-8">
        <div class="stat-card animate-fade-in delay-1">
          <div class="stat-icon" style="background: var(--primary-50);">
            <span style="color: var(--primary-500); font-size: 1.35rem;">📊</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${data.turnout.percentage}%</p>
            <p class="stat-label">Voter Turnout</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-2">
          <div class="stat-icon" style="background: var(--success-50);">
            <span style="color: var(--success-500); font-size: 1.35rem;">✓</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${data.turnout.totalVotes}</p>
            <p class="stat-label">Votes Cast</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-3">
          <div class="stat-icon" style="background: var(--warning-50);">
            <span style="color: var(--warning-500); font-size: 1.35rem;">⏰</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${data.peakVoting.hour}</p>
            <p class="stat-label">Peak Hour</p>
          </div>
        </div>
        <div class="stat-card animate-fade-in delay-4">
          <div class="stat-icon" style="background: var(--accent-50);">
            <span style="color: var(--accent-500); font-size: 1.35rem;">🏁</span>
          </div>
          <div class="stat-info">
            <p class="stat-value">${data.candidateAnalysis.competitiveness}</p>
            <p class="stat-label">Race Status</p>
          </div>
        </div>
      </div>

      <!-- AI Insights -->
      <div class="mb-8">
        <h2 style="font-size: 1.15rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🧠</span> AI-Generated Insights
        </h2>
        <div class="elections-grid">
          ${insightsHtml}
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid mb-8">
        <div class="card animate-fade-in delay-5" style="padding: 20px;">
          <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--primary-500);">📈</span> Voting Velocity (Votes/Hour)
          </h3>
          <div class="chart-container">
            <canvas id="velocityChart"></canvas>
          </div>
        </div>
        <div class="card animate-fade-in delay-6" style="padding: 20px;">
          <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-400);">⏱️</span> Hour-wise Distribution
          </h3>
          <div class="chart-container">
            <canvas id="hourChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Candidate Rankings -->
      <div class="card-static animate-fade-in delay-7 mb-8" style="overflow: hidden;">
        <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">Candidate Performance</h3>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Lead margin: ${data.candidateAnalysis.leadMargin} votes</span>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr><th>Rank</th><th>Candidate</th><th>Party</th><th>Votes</th><th>Share</th></tr>
            </thead>
            <tbody>${candidateRows}</tbody>
          </table>
        </div>
      </div>
    `;

    // Render charts
    renderAnalyticsCharts(data);

  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to load analytics', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
})();

function renderAnalyticsCharts(data) {
  // Velocity Chart (line)
  if (data.votingVelocity.length > 0) {
    const velCtx = document.getElementById('velocityChart').getContext('2d');
    new Chart(velCtx, {
      type: 'line',
      data: {
        labels: data.votingVelocity.map(v => v.label),
        datasets: [{
          label: 'Votes',
          data: data.votingVelocity.map(v => v.count),
          borderColor: '#5b5fc7',
          backgroundColor: 'rgba(91, 95, 199, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#5b5fc7'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { ticks: { color: '#64748b' }, grid: { display: false } }
        }
      }
    });
  }

  // Hour Distribution Chart (bar)
  const hours = data.peakVoting.distribution;
  if (Object.keys(hours).length > 0) {
    const sortedHours = Object.keys(hours).sort((a, b) => parseInt(a) - parseInt(b));
    const hourCtx = document.getElementById('hourChart').getContext('2d');
    new Chart(hourCtx, {
      type: 'bar',
      data: {
        labels: sortedHours.map(h => `${h.padStart(2, '0')}:00`),
        datasets: [{
          label: 'Votes',
          data: sortedHours.map(h => hours[h]),
          backgroundColor: sortedHours.map(h => parseInt(h) === parseInt(Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0]) ? 'rgba(91, 95, 199, 0.8)' : 'rgba(91, 95, 199, 0.25)'),
          borderColor: '#5b5fc7',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { ticks: { color: '#64748b' }, grid: { display: false } }
        }
      }
    });
  }
}

// ─── Export Functions ─────────────────────────────────────────────

async function exportCSV(electionId) {
  try {
    window.open(`/api/votes/export/${electionId}?format=csv`, '_blank');
    showToast('CSV download started!', 'success');
  } catch (e) {
    showToast('Export failed', 'error');
  }
}

function exportPDF() {
  try {
    window.print();
    showToast('Print/PDF dialog opened!', 'success');
  } catch (e) {
    showToast('PDF export failed', 'error');
  }
}
