// ─── Login Page Logic ────────────────────────────────────────────

// If already logged in, redirect
if (isLoggedIn()) {
  const user = getCurrentUser();
  window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Signing in...';

  try {
    const data = await api.post('/auth/login', { email, password });

    // Save token and user data
    setToken(data.data.token);
    saveUser(data.data.user);

    showToast(`Welcome back, ${data.data.user.name}!`, 'success');

    // Redirect based on role
    setTimeout(() => {
      window.location.href = data.data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
    }, 500);
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed. Please try again.';
    showToast(message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
