// ─── Login Page Logic ────────────────────────────────────────────

// If already logged in, redirect
if (isLoggedIn()) {
  const user = getCurrentUser();
  window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
}

let pendingOTP = null; // { userId, email }

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('login-submit');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Signing in...';

  try {
    const data = await api.post('/auth/login', { email, password });

    if (data.data.requiresOTP) {
      // MFA is enabled — show OTP form
      pendingOTP = { userId: data.data.userId, email: data.data.email };
      showOTPForm();

      // Show OTP via browser alert for dev/demo
      if (data.data.otpCode) {
        alert('🔐 Your OTP Code: ' + data.data.otpCode + '\n\nThis code expires in 5 minutes.');
      }
      return;
    }

    // No MFA — direct login
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

function showOTPForm() {
  const container = document.querySelector('.auth-form');
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 2.5rem; margin-bottom: 8px;">🔐</div>
      <h3 style="color: var(--text-primary); font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">Enter Verification Code</h3>
      <p style="color: var(--text-muted); font-size: 0.85rem;">A 6-digit OTP has been sent to <strong>${pendingOTP.email}</strong></p>
    </div>

    <form id="otp-form">
      <div class="form-group">
        <label for="otp-code">OTP Code</label>
        <div class="input-with-icon">
          <span class="input-icon">🔑</span>
          <input type="text" id="otp-code" class="input-field" placeholder="Enter 6-digit code" required 
            minlength="6" maxlength="6" pattern="[0-9]{6}" inputmode="numeric"
            style="font-size: 1.2rem; letter-spacing: 6px; text-align: center; font-family: monospace;">
        </div>
      </div>

      <button type="submit" id="otp-submit" class="btn-primary w-full mt-2">
        Verify & Login
      </button>
    </form>

    <div class="text-center mt-6" style="display: flex; gap: 12px; justify-content: center;">
      <button onclick="resendOTP()" id="resend-btn" style="color: var(--primary-500); font-weight: 600; font-size: 0.85rem; background: none; border: none; cursor: pointer;">
        Resend OTP
      </button>
      <span style="color: var(--text-muted);">|</span>
      <a href="/index.html" style="color: var(--text-muted); font-size: 0.85rem;">Back to Login</a>
    </div>

    <div class="demo-credentials" style="margin-top: 20px;">
      <p class="demo-credentials-title">⏰ OTP expires in 5 minutes</p>
      <p style="font-size: 0.8rem; color: var(--text-muted);">Check your email for the verification code. If using test mode, check the server console for the Ethereal preview URL.</p>
    </div>
  `;

  document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('otp-code').value;
    const btn = document.getElementById('otp-submit');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> Verifying...';

    try {
      const data = await api.post('/auth/verify-otp', {
        userId: pendingOTP.userId,
        otpCode: code
      });

      setToken(data.data.token);
      saveUser(data.data.user);

      showToast(`Welcome back, ${data.data.user.name}!`, 'success');

      setTimeout(() => {
        window.location.href = data.data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
      }, 500);
    } catch (error) {
      showToast(error.response?.data?.message || 'Invalid OTP', 'error');
      btn.disabled = false;
      btn.textContent = 'Verify & Login';
    }
  });
}

async function resendOTP() {
  const btn = document.getElementById('resend-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const data = await api.post('/auth/resend-otp', {
      userId: pendingOTP.userId,
      purpose: 'login'
    });
    showToast('New OTP sent!', 'success');

    // Show new OTP via browser alert
    if (data.data && data.data.otpCode) {
      alert('🔐 Your New OTP Code: ' + data.data.otpCode + '\n\nThis code expires in 5 minutes.');
    }
  } catch (error) {
    showToast('Failed to resend OTP', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Resend OTP';
}
