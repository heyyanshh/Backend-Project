// ─── Audit Logs Logic ────────────────────────────────────────────

let currentPage = 1;
let currentFilter = '';

(async function() {
  if (!requireAdmin()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('audit');
  await loadAuditLogs();
})();

async function loadAuditLogs() {
  try {
    let endpoint = `/admin/audit-logs?page=${currentPage}&limit=25`;
    if (currentFilter) endpoint += `&action=${currentFilter}`;

    const data = await api.get(endpoint);
    const { logs, pagination } = data.data;

    document.getElementById('loading').classList.add('hidden');
    const content = document.getElementById('audit-content');
    content.classList.remove('hidden');

    const actionColors = {
      'USER_REGISTERED': 'var(--success-500)',
      'USER_LOGIN': 'var(--primary-500)',
      'VOTE_CAST': 'var(--success-500)',
      'ELECTION_CREATED': 'var(--accent-500)',
      'ELECTION_UPDATED': 'var(--warning-500)',
      'ELECTION_STATUS_CHANGED': 'var(--warning-500)',
      'CANDIDATE_ADDED': 'var(--primary-500)',
      'CANDIDATE_REMOVED': 'var(--danger-500)',
      'CHAIN_VERIFIED': 'var(--success-500)',
      'DUPLICATE_VOTE_ATTEMPT': 'var(--danger-500)'
    };

    const actionIcons = {
      'USER_REGISTERED': '📝',
      'USER_LOGIN': '🔑',
      'VOTE_CAST': '🗳️',
      'ELECTION_CREATED': '📋',
      'ELECTION_UPDATED': '✏️',
      'ELECTION_STATUS_CHANGED': '🔄',
      'CANDIDATE_ADDED': '➕',
      'CANDIDATE_REMOVED': '🗑️',
      'CHAIN_VERIFIED': '🛡️',
      'DUPLICATE_VOTE_ATTEMPT': '⚠️'
    };

    let tableRows = '';
    if (logs.length === 0) {
      tableRows = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No audit logs found.</td></tr>`;
    } else {
      logs.forEach(log => {
        const color = actionColors[log.action] || 'var(--text-muted)';
        const icon = actionIcons[log.action] || '📄';
        tableRows += `
          <tr>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</td>
            <td>
              <span style="display: inline-flex; align-items: center; gap: 6px; color: ${color}; font-weight: 500; font-size: 0.825rem;">
                ${icon} ${log.action.replace(/_/g, ' ')}
              </span>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${log.userId?.name || 'System'}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${log.userId?.email || '—'}</td>
            <td style="color: var(--text-muted); font-size: 0.75rem; font-family: monospace;">${log.ipAddress || '—'}</td>
          </tr>
        `;
      });
    }

    // Pagination
    let paginationHtml = '';
    if (pagination.pages > 1) {
      paginationHtml = `<div class="flex items-center justify-center gap-3 mt-6">`;
      if (currentPage > 1) {
        paginationHtml += `<button onclick="goToPage(${currentPage - 1})" class="btn-secondary btn-sm">← Previous</button>`;
      }
      paginationHtml += `<span style="color: var(--text-muted); font-size: 0.85rem;">Page ${pagination.current} of ${pagination.pages} (${pagination.total} total)</span>`;
      if (currentPage < pagination.pages) {
        paginationHtml += `<button onclick="goToPage(${currentPage + 1})" class="btn-secondary btn-sm">Next →</button>`;
      }
      paginationHtml += `</div>`;
    }

    // Filter buttons
    const actions = ['', 'VOTE_CAST', 'USER_REGISTERED', 'USER_LOGIN', 'ELECTION_CREATED', 'ELECTION_STATUS_CHANGED', 'CANDIDATE_ADDED', 'CHAIN_VERIFIED', 'DUPLICATE_VOTE_ATTEMPT'];
    const filterLabels = ['All', 'Votes', 'Registrations', 'Logins', 'Elections Created', 'Status Changes', 'Candidates Added', 'Chain Verified', 'Duplicate Attempts'];

    let filtersHtml = actions.map((action, i) => `
      <button onclick="filterLogs('${action}')" class="${currentFilter === action ? 'btn-primary' : 'btn-secondary'} btn-sm" style="font-size: 0.75rem; padding: 6px 12px;">
        ${filterLabels[i]}
      </button>
    `).join('');

    content.innerHTML = `
      <div class="animate-slide-down mb-6">
        <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Audit Logs</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Complete activity trail for transparency and accountability</p>
      </div>

      <div class="flex flex-wrap gap-2 mb-5 animate-fade-in delay-1">
        ${filtersHtml}
      </div>

      <div class="card-static animate-fade-in delay-2" style="overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>Email</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>

      ${paginationHtml}
    `;
  } catch (error) {
    showToast('Failed to load audit logs', 'error');
    document.getElementById('loading').classList.add('hidden');
  }
}

function filterLogs(action) {
  currentFilter = action;
  currentPage = 1;
  loadAuditLogs();
}

function goToPage(page) {
  currentPage = page;
  loadAuditLogs();
}
