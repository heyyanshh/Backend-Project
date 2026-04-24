// ─── Auth State Management ───────────────────────────────────────

// Get current user from localStorage
function getCurrentUser() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

// Save user to localStorage
function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data
function clearAuth() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

// Check if user is logged in
function isLoggedIn() {
  return !!getToken() && !!getCurrentUser();
}

// Check if user is admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// Redirect if not authenticated
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Redirect if not admin
function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

// Redirect if not voter
function requireVoter() {
  if (!requireAuth()) return false;
  if (isAdmin()) {
    window.location.href = '/admin.html';
    return false;
  }
  return true;
}

// Logout function
async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignore errors on logout
  }
  clearAuth();
  window.location.href = '/index.html';
}

// Verify token is still valid on page load
async function verifyAuth() {
  if (!isLoggedIn()) return false;
  try {
    const data = await api.get('/auth/me');
    saveUser(data.data.user);
    return true;
  } catch (error) {
    clearAuth();
    return false;
  }
}

// ─── Sidebar Renderer (replaces old Navbar) ─────────────────────
function renderSidebar(activePage) {
  const user = getCurrentUser();
  if (!user) return;

  const isAdminUser = user.role === 'admin';
  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  let navLinks = '';

  if (isAdminUser) {
    navLinks = `
      <div class="sidebar-section-label">Main</div>
      <nav class="sidebar-nav">
        <a href="/admin.html" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
          <span class="sidebar-link-icon">📊</span>
          Dashboard
        </a>
      </nav>

      <div class="sidebar-section-label">Management</div>
      <nav class="sidebar-nav">
        <a href="/elections.html" class="sidebar-link ${activePage === 'elections' ? 'active' : ''}">
          <span class="sidebar-link-icon">📋</span>
          Elections
        </a>
        <a href="/analytics.html" class="sidebar-link ${activePage === 'analytics' ? 'active' : ''}">
          <span class="sidebar-link-icon">🤖</span>
          AI Analytics
        </a>
        <a href="/audit.html" class="sidebar-link ${activePage === 'audit' ? 'active' : ''}">
          <span class="sidebar-link-icon">🔍</span>
          Audit Logs
        </a>
      </nav>
    `;
  } else {
    navLinks = `
      <div class="sidebar-section-label">Main</div>
      <nav class="sidebar-nav">
        <a href="/dashboard.html" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
          <span class="sidebar-link-icon">\ud83d\udcca</span>
          Dashboard
        </a>
      </nav>

      <div class="sidebar-section-label">Quick Actions</div>
      <nav class="sidebar-nav">
        <a href="/dashboard.html#active" class="sidebar-link ${activePage === 'elections' ? 'active' : ''}">
          <span class="sidebar-link-icon">\ud83d\uddf3\ufe0f</span>
          Cast Vote
        </a>
        <a href="/dashboard.html#results" class="sidebar-link ${activePage === 'results' ? 'active' : ''}">
          <span class="sidebar-link-icon">\ud83d\udcc8</span>
          Election Results
        </a>
      </nav>

      <div class="sidebar-section-label">Account</div>
      <nav class="sidebar-nav">
        <a href="/dashboard.html#profile" class="sidebar-link ${activePage === 'profile' ? 'active' : ''}">
          <span class="sidebar-link-icon">\ud83d\udc64</span>
          My Profile
        </a>
      </nav>
    `;
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <a href="${isAdminUser ? '/admin.html' : '/dashboard.html'}" class="sidebar-brand">
        <div class="sidebar-brand-icon">🗳️</div>
        <span class="sidebar-brand-text">E-Vote</span>
      </a>

      ${navLinks}

      <div class="sidebar-user">
        <div class="sidebar-avatar">${initial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
        <button onclick="logout()" class="sidebar-logout">Logout</button>
      </div>
    `;
  }

  // Setup top header
  const topHeader = document.getElementById('top-header');
  if (topHeader) {
    const pageTitle = getPageTitle(activePage);
    topHeader.querySelector('.top-header-left').innerHTML = `
      <button class="mobile-menu-btn" onclick="toggleMobileSidebar()">☰</button>
      <div>
        <h1>${pageTitle}</h1>
        <p>Welcome, ${user.name}</p>
      </div>
    `;

    topHeader.querySelector('.top-header-right').innerHTML = `
      <div class="header-search" style="position: relative;" id="global-search-container">
        <span class="header-search-icon">🔍</span>
        <input type="text" id="global-search-input" placeholder="Search pages..." oninput="handleSearch(event)" onfocus="handleSearch(event)">
        <div id="search-dropdown" class="search-dropdown"></div>
      </div>
      <button class="header-icon-btn" onclick="toggleTheme()" id="theme-btn" title="Toggle Theme">${localStorage.getItem('theme') === 'dark' ? '☀️' : '🌙'}</button>
      <div style="position: relative;">
        <button class="header-icon-btn" onclick="toggleNotifications()" id="notif-btn">
          🔔
          <span class="header-notification-dot"></span>
        </button>
        <div class="notification-dropdown" id="notif-dropdown">
          <div class="notification-header" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Recent Notifications</span>
            <span style="font-size: 0.75rem; color: var(--primary-500); cursor: pointer; font-weight: 500;" onclick="clearNotifications()">Clear All</span>
          </div>
          <div class="notification-list" id="notif-list">
            <div class="notification-item">
              <div class="notification-icon">🎉</div>
              <div class="notification-content">
                <p>Welcome to the newly redesigned E-Vote system!</p>
                <span class="notification-time">Just now</span>
              </div>
            </div>
            <div class="notification-item">
              <div class="notification-icon">🛡️</div>
              <div class="notification-content">
                <p>Security check passed. Your connection is encrypted.</p>
                <span class="notification-time">2 mins ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Setup sidebar overlay for mobile
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', toggleMobileSidebar);
  }
}

function getPageTitle(page) {
  const titles = {
    'dashboard': 'Dashboard',
    'elections': 'Elections',
    'audit': 'Audit Logs',
    'vote': 'Cast Your Vote',
    'results': 'Election Results',
    'analytics': 'AI Analytics',
    'verify': 'Verify Vote'
  };
  return titles[page] || 'Dashboard';
}

// Mobile sidebar toggle
function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('active');
}

// Keep backward compatibility — renderNavbar now calls renderSidebar
function renderNavbar(activePage) {
  renderSidebar(activePage);
}

// ─── Interactive Header & Theme Logic ────────────────────────────

// Search functionality
window.handleSearch = function(e) {
  const query = e.target.value.toLowerCase();
  const dropdown = document.getElementById('search-dropdown');
  const user = getCurrentUser();
  
  if (!user || !dropdown) return;

  const isAdminUser = user.role === 'admin';
  
  // Define available site sections based on user role
  let sections = [
    { name: 'Dashboard', url: isAdminUser ? '/admin.html' : '/dashboard.html', icon: '\ud83d\udcca' }
  ];
  
  if (isAdminUser) {
    sections.push({ name: 'Elections', url: '/elections.html', icon: '\ud83d\udccb' });
    sections.push({ name: 'AI Analytics', url: '/analytics.html', icon: '\ud83e\udd16' });
    sections.push({ name: 'Audit Logs', url: '/audit.html', icon: '\ud83d\udd0d' });
  } else {
    sections.push({ name: 'Cast Vote', url: '/dashboard.html#active', icon: '\ud83d\uddf3\ufe0f' });
    sections.push({ name: 'Election Results', url: '/dashboard.html#results', icon: '\ud83d\udcc8' });
    sections.push({ name: 'My Profile', url: '/dashboard.html#profile', icon: '\ud83d\udc64' });
  }

  // Filter sections
  let filtered = query 
    ? sections.filter(s => s.name.toLowerCase().includes(query)) 
    : sections;
  
  // Render dropdown
  if (filtered.length > 0) {
    dropdown.innerHTML = filtered.map(s => `
      <a href="${s.url}" class="search-item">
        <span class="search-item-icon">${s.icon}</span>
        ${s.name}
      </a>
    `).join('');
  } else {
    dropdown.innerHTML = `
      <div class="search-item" style="color: var(--text-muted); cursor: default; pointer-events: none;">
        No pages found
      </div>
    `;
  }
  
  dropdown.classList.add('active');
};

// Theme initialization and toggling
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }
};

// Notification dropdown logic
window.toggleNotifications = function() {
  const dropdown = document.getElementById('notif-dropdown');
  const dot = document.querySelector('.header-notification-dot');
  
  if (dropdown) {
    dropdown.classList.toggle('active');
  }
  
  if (dot) {
    dot.style.display = 'none'; // clear badge when opened
  }
};

// Clear notifications
window.clearNotifications = function() {
  const list = document.getElementById('notif-list');
  if (list) {
    list.innerHTML = `
      <div style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <div style="font-size: 1.5rem; margin-bottom: 8px; opacity: 0.5;">📭</div>
        No new notifications
      </div>
    `;
  }
};

// Close menus on outside click
document.addEventListener('click', (e) => {
  // Notification menu
  const notifDropdown = document.getElementById('notif-dropdown');
  const notifBtn = document.getElementById('notif-btn');
  if (notifDropdown && notifBtn && !notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
    notifDropdown.classList.remove('active');
  }

  // Search menu
  const searchContainer = document.getElementById('global-search-container');
  const searchDropdown = document.getElementById('search-dropdown');
  if (searchContainer && searchDropdown && !searchContainer.contains(e.target)) {
    searchDropdown.classList.remove('active');
  }
});
