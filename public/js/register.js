// ─── Register Page Logic with Face ID ────────────────────────────

if (isLoggedIn()) {
  window.location.href = '/dashboard.html';
}

// face-api.js CDN model URL (same as vote.js)
const FACE_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

let registrationData = null;
let modelsLoaded = false;
let isDetecting = false;
let faceDescriptor = null;
let scanStartTime = null; // Track when scanning started
const MIN_SCAN_DURATION = 3000; // Minimum 3 seconds of scanning

// DOM Elements
const form = document.getElementById('register-form');
const submitBtn = document.getElementById('register-submit');

// 1. Initial form submit -> Opens Face Modal
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  registrationData = {
    name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value
  };

  openFaceModal();
});

// 2. Face Modal Logic
async function openFaceModal() {
  const modal = document.getElementById('face-modal');
  modal.style.display = 'flex';
  updateFaceStatus('loading', 'Loading Face ID models...', true);

  try {
    // Check if face-api.js is loaded
    if (typeof faceapi === 'undefined') {
      throw new Error('Face detection library failed to load. Please refresh the page.');
    }

    // Load models from CDN
    if (!modelsLoaded) {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL)
      ]);
      modelsLoaded = true;
    }

    updateFaceStatus('loading', 'Starting camera...', true);

    // Start webcam
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 480 }, 
        height: { ideal: 360 },
        facingMode: 'user' 
      }
    });

    const video = document.getElementById('face-video');
    video.srcObject = stream;
    
    video.onloadedmetadata = () => {
      video.play();
      updateFaceStatus('info', '\ud83d\udcf8 Scanning your face... Hold still for 3 seconds', false);
      const scanLine = document.getElementById('face-scan-line');
      if (scanLine) scanLine.style.display = 'block';
      scanStartTime = Date.now(); // Start the timer
      startDetectionLoop();
    };

  } catch (error) {
    console.error('Face modal error:', error);

    let errorMsg = 'Face setup failed. ';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg = 'Camera access was denied. Please allow camera access in your browser settings.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg = 'No camera found. Please connect a webcam and try again.';
    } else {
      errorMsg += error.message;
    }

    updateFaceStatus('error', '\u274c ' + errorMsg, false);

    // Offer to skip Face ID
    const statusDiv = document.getElementById('face-status');
    setTimeout(() => {
      statusDiv.innerHTML += `
        <div style="margin-top: 12px;">
          <button onclick="skipFaceAndRegister()" class="btn-secondary btn-sm" style="font-size: 0.8rem;">
            Continue without Face ID
          </button>
        </div>
      `;
    }, 2000);
  }
}

function updateFaceStatus(type, text, showSpinner = false) {
  const statusDiv = document.getElementById('face-status');
  if (!statusDiv) return;
  statusDiv.className = `face-status face-status-${type}`;
  statusDiv.innerHTML = `
    ${showSpinner ? '<div class="spinner spinner-sm"></div>' : ''}
    <span>${text}</span>
  `;
}

function closeFaceModal() {
  const modal = document.getElementById('face-modal');
  if (modal) modal.style.display = 'none';
  isDetecting = false;
  const video = document.getElementById('face-video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
}

// Skip face and register without Face ID
function skipFaceAndRegister() {
  closeFaceModal();
  faceDescriptor = null;
  submitRegistration();
}

async function startDetectionLoop() {
  isDetecting = true;
  
  const video = document.getElementById('face-video');
  const canvas = document.getElementById('face-overlay');

  // Setup canvas
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  let capturedDescriptor = null;

  const loop = async () => {
    if (!isDetecting) return;

    const elapsed = Date.now() - scanStartTime;
    const remaining = Math.max(0, MIN_SCAN_DURATION - elapsed);
    const progress = Math.min(100, Math.round((elapsed / MIN_SCAN_DURATION) * 100));

    try {
      // Detect face, landmarks, and extract 128D descriptor
      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Draw mesh
        const resizedDetections = faceapi.resizeResults(detection, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (detection.detection.score >= 0.7) {
          // Save the descriptor but keep scanning until 3 seconds
          capturedDescriptor = Array.from(detection.descriptor);

          if (remaining > 0) {
            // Still within minimum duration — show progress
            updateFaceStatus('info', '\ud83d\udcf8 Scanning face... ' + progress + '% (' + Math.ceil(remaining / 1000) + 's remaining)', false);
          } else {
            // 3 seconds elapsed — capture is complete!
            updateFaceStatus('success', '\u2705 Face ID Captured! Registering your account...', false);
            const scanLine = document.getElementById('face-scan-line');
            if (scanLine) scanLine.style.display = 'none';
            isDetecting = false;
            
            faceDescriptor = capturedDescriptor;
            submitRegistration();
            return;
          }
        }
      } else {
        // No face — reset timer
        scanStartTime = Date.now();
        capturedDescriptor = null;
      }
    } catch (e) {
      // Silently handle detection errors
    }

    setTimeout(loop, 300);
  };

  loop();
}

async function submitRegistration() {
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> Creating Account...';
  
  try {
    const payload = {
      ...registrationData
    };

    // Only include faceDescriptor if it was captured
    if (faceDescriptor && faceDescriptor.length > 0) {
      payload.faceDescriptor = faceDescriptor;
    }

    const data = await api.post('/auth/register', payload);

    closeFaceModal();

    // Do NOT auto-login — redirect to login page
    const msg = faceDescriptor 
      ? 'Account created with Face ID! Please sign in.'
      : 'Account created! Please sign in.';
    showToast(msg, 'success');

    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500);

  } catch (error) {
    closeFaceModal();
    const msg = error.response?.data?.message || 
      error.response?.data?.errors?.map(e => e.message).join(', ') || 
      'Registration failed.';
    showToast(msg, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}
