// ─── API Helper (replaces Axios) ─────────────────────────────────
const API_BASE = '/api';

// Get stored token
function getToken() {
  return localStorage.getItem('token');
}

// Set stored token
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove stored token
function removeToken() {
  localStorage.removeItem('token');
}

// Make API request using fetch
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    ...options
  };

  // Add auth token if available
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Convert body to JSON string if needed
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw { response: { status: response.status, data } };
    }

    return data;
  } catch (error) {
    if (error.response) {
      throw error;
    }
    throw { response: { status: 500, data: { message: 'Network error. Please try again.' } } };
  }
}

// Shorthand methods
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' })
};

// ─── Toast Notification System ───────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;

  toast.addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}
