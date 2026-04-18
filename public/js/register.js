// ─── Register Page Logic ─────────────────────────────────────────

if (isLoggedIn()) {
  window.location.href = '/dashboard.html';
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const submitBtn = document.getElementById('register-submit');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Creating Account...';

  try {
    const data = await api.post('/auth/register', { name, email, password });

    setToken(data.data.token);
    saveUser(data.data.user);

    showToast(`Welcome, ${data.data.user.name}! Your Voter ID: ${data.data.user.voterId}`, 'success');

    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 800);
  } catch (error) {
    const msg = error.response?.data?.message || 
      error.response?.data?.errors?.map(e => e.message).join(', ') || 
      'Registration failed.';
    showToast(msg, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
