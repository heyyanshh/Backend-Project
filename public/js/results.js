// ─── Results Page Logic ──────────────────────────────────────────

(async function() {
  if (!requireAuth()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('results');

  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');
  if (!electionId) { history.back(); return; }

  try {
    const response = await api.get(`/admin/results/${electionId}`);
    const data = response.data;

    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('results-content');
    content.classList.remove('hidden');

    const chartColors = ['#5b5fc7', '#8b5cf6', '#a78bfa', '#c084fc', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6'];

    // Build results table rows
    let tableRows = '';
    data.results.forEach((result, index) => {
      const color = chartColors[index % chartColors.length];
      tableRows += `
        <tr>
          <td>
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;
              background: ${index === 0 ? 'var(--primary-50)' : 'var(--gray-50)'};
              color: ${index === 0 ? 'var(--primary-600)' : 'var(--text-muted)'};">
              #${index + 1}
            </span>
          </td>
          <td style="color: var(--text-primary); font-weight: 500;">${result.name}</td>
          <td style="color: var(--text-secondary);">${result.party}</td>
          <td style="color: var(--text-primary); font-weight: 600;">${result.voteCount}</td>
          <td style="color: var(--primary-500); font-weight: 500;">${result.percentage}%</td>
          <td style="width: 180px;">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: 0%; background: ${color};" data-width="${result.percentage}"></div>
            </div>
          </td>
        </tr>
      `;
    });

    // Winner banner
    let winnerHtml = '';
    if (data.winner) {
      winnerHtml = `
        <div class="winner-banner animate-fade-in delay-2">
          <div class="winner-icon">⭐</div>
          <div>
            <p class="winner-label">🏆 Election Winner</p>
            <h2 class="winner-name">${data.winner.name}</h2>
            <p class="winner-detail">${data.winner.party} · ${data.winner.voteCount} votes</p>
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="animate-slide-down mb-8">
        <a href="javascript:history.back()" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; text-decoration: none;">
          ← Back
        </a>
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${data.election.title}</h1>
            <p style="color: var(--text-muted); display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
              <span class="badge badge-${data.election.status}">${data.election.status}</span>
              · ${data.election.totalVotes} total votes
            </p>
          </div>
        </div>
      </div>

      ${winnerHtml}

      <div class="charts-grid">
        <div class="card animate-fade-in delay-3" style="padding: 20px;">
          <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--primary-500);">📊</span> Vote Distribution
          </h3>
          <div class="chart-container">
            <canvas id="barChart"></canvas>
          </div>
        </div>
        <div class="card animate-fade-in delay-4" style="padding: 20px;">
          <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-400);">📊</span> Vote Share
          </h3>
          <div class="chart-container">
            <canvas id="doughnutChart"></canvas>
          </div>
        </div>
      </div>

      <div class="card-static animate-fade-in delay-5" style="overflow: hidden;">
        <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Detailed Results</h3>
        </div>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Party</th>
                <th>Votes</th>
                <th>Percentage</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render charts
    renderCharts(data, chartColors);

    // Animate progress bars
    setTimeout(() => {
      document.querySelectorAll('.progress-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
    }, 600);

  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to load results', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
})();

function renderCharts(data, chartColors) {
  // Bar Chart
  const barCtx = document.getElementById('barChart').getContext('2d');
  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: data.results.map(r => r.name),
      datasets: [{
        label: 'Votes',
        data: data.results.map(r => r.voteCount),
        backgroundColor: data.results.map((_, i) => chartColors[i % chartColors.length] + '30'),
        borderColor: data.results.map((_, i) => chartColors[i % chartColors.length]),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#1e293b',
          bodyColor: '#64748b',
          borderColor: '#e8e8ef',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8', stepSize: 1 },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { color: '#64748b' },
          grid: { display: false }
        }
      }
    }
  });

  // Doughnut Chart
  const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
  new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: data.results.map(r => `${r.name} (${r.party})`),
      datasets: [{
        data: data.results.map(r => r.voteCount),
        backgroundColor: data.results.map((_, i) => chartColors[i % chartColors.length] + 'cc'),
        borderColor: 'white',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12,
            font: { size: 12 }
          }
        }
      },
      cutout: '55%'
    }
  });
}
