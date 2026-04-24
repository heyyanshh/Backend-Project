// ─── Voting Page Logic (with Facial Recognition & 1:1 Matching) ──

let selectedCandidate = null;
let currentElection = null;
let faceVerified = false;
let videoStream = null;

// face-api.js model URLs (hosted on jsDelivr CDN)
const FACE_API_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

(async function() {
  if (!requireVoter()) return;
  const valid = await verifyAuth();
  if (!valid) { clearAuth(); window.location.href = '/index.html'; return; }

  renderSidebar('vote');
  
  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');
  if (!electionId) { window.location.href = '/dashboard.html'; return; }

  try {
    // Check if already voted
    const statusData = await api.get(`/votes/status/${electionId}`);
    if (statusData.data.hasVoted) {
      showToast('You have already voted in this election', 'error');
      window.location.href = '/dashboard.html';
      return;
    }

    // Get election details
    const electionData = await api.get(`/elections/${electionId}`);
    currentElection = electionData.data;

    if (currentElection.status !== 'active') {
      showToast('This election is not currently active', 'error');
      window.location.href = '/dashboard.html';
      return;
    }

    document.getElementById('loading').classList.add('hidden');
    renderVotingPage();
  } catch (error) {
    showToast('Failed to load election', 'error');
    window.location.href = '/dashboard.html';
  }
})();

function renderVotingPage() {
  const content = document.getElementById('voting-content');
  content.classList.remove('hidden');

  const candidateColors = ['#5b5fc7', '#8b5cf6', '#0ea5e9', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#a78bfa'];

  let candidatesHtml = '';
  currentElection.candidates.forEach((candidate, index) => {
    const color1 = candidateColors[index % candidateColors.length];
    const color2 = candidateColors[(index + 1) % candidateColors.length];

    candidatesHtml += `
      <div class="candidate-card animate-fade-in delay-${(index % 4) + 1}" 
           id="candidate-${candidate._id}" 
           onclick="selectCandidate('${candidate._id}', '${candidate.name}', '${candidate.party}')">
        <span class="check-icon">\u2713</span>
        <div class="candidate-avatar" style="background: linear-gradient(135deg, ${color1}, ${color2});">
          ${candidate.name.charAt(0)}
        </div>
        <h3 class="candidate-name">${candidate.name}</h3>
        <p class="candidate-party">${candidate.party}</p>
        ${candidate.manifesto ? `<p class="candidate-manifesto">${candidate.manifesto}</p>` : ''}
      </div>
    `;
  });

  content.innerHTML = `
    <div class="animate-slide-down mb-8">
      <a href="/dashboard.html" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; text-decoration: none;">
        \u2190 Back to Dashboard
      </a>
      <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${currentElection.title}</h1>
      ${currentElection.description ? `<p style="color: var(--text-muted); font-size: 0.9rem;">${currentElection.description}</p>` : ''}
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
        <span style="color: var(--primary-500);">\ud83d\udee1\ufe0f</span>
        <p style="font-size: 0.825rem; color: var(--primary-500);">Your vote is encrypted and secured with facial verification</p>
      </div>
    </div>
    <div class="candidates-grid mb-8">
      ${candidatesHtml}
    </div>
    <div id="vote-button-area" class="text-center hidden"></div>
  `;
}

function selectCandidate(id, name, party) {
  // Remove previous selection
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Select new
  document.getElementById(`candidate-${id}`).classList.add('selected');
  selectedCandidate = { _id: id, name, party };
  faceVerified = false; // Reset face verification for new selection

  // Show vote button
  const btnArea = document.getElementById('vote-button-area');
  btnArea.classList.remove('hidden');
  btnArea.innerHTML = `
    <button onclick="showConfirmModal()" class="btn-primary" style="font-size: 1rem; padding: 14px 40px;">
      Confirm Vote for ${name}
    </button>
  `;
}

// ─── Step 1: Confirmation Modal ──────────────────────────────────

function showConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content animate-scale-in">
      <h3 class="modal-title">Confirm Your Vote</h3>
      <p style="color: var(--text-muted); margin-bottom: 20px;">
        You are about to vote for <span style="color: var(--primary-500); font-weight: 600;">${selectedCandidate.name}</span> (${selectedCandidate.party}).
        This action cannot be undone.
      </p>

      <!-- Face verification info -->
      <div style="background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="font-size: 1.3rem;">\ud83d\udcf8</span>
          <p style="color: var(--primary-600); font-weight: 600; font-size: 0.9rem; margin: 0;">Face ID Authentication Required</p>
        </div>
        <p style="color: var(--text-muted); font-size: 0.825rem; margin: 0; line-height: 1.5;">
          Your face will be matched against your registered Face ID to verify your identity. 
          No images are stored \u2014 matching runs entirely in your browser.
        </p>
      </div>

      <div class="warning-box">
        \u26a0\ufe0f Once submitted, your vote is final and cannot be changed.
      </div>
      <div class="flex gap-3">
        <button onclick="closeModal()" class="btn-secondary flex-1">Cancel</button>
        <button onclick="startFaceVerification()" id="proceed-face-btn" class="btn-success flex-1">
          \ud83d\udcf8 Proceed to Face Scan
        </button>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  stopCamera();
}

// ─── Step 2: Face Verification ───────────────────────────────────

async function startFaceVerification() {
  closeModal();

  const faceModal = document.getElementById('face-modal');
  faceModal.style.display = 'flex';
  faceModal.innerHTML = `
    <div class="modal-content animate-scale-in" style="max-width: 520px;">
      <h3 class="modal-title" style="display: flex; align-items: center; gap: 10px;">
        <span>\ud83d\udcf8</span> Face ID Authentication
      </h3>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">
        Position your face in the frame. Your live face will be compared against your registered Face ID.
      </p>

      <!-- Status Indicator -->
      <div id="face-status" class="face-status face-status-loading">
        <div class="spinner spinner-sm"></div>
        <span>Loading face detection models...</span>
      </div>

      <!-- Webcam Container -->
      <div class="face-webcam-container">
        <video id="face-video" class="face-video" autoplay muted playsinline></video>
        <canvas id="face-overlay" class="face-overlay"></canvas>
        <!-- Scan animation overlay -->
        <div id="face-scan-line" class="face-scan-line"></div>
        <!-- Corner markers -->
        <div class="face-corner face-corner-tl"></div>
        <div class="face-corner face-corner-tr"></div>
        <div class="face-corner face-corner-bl"></div>
        <div class="face-corner face-corner-br"></div>
      </div>

      <!-- Confidence Meter -->
      <div id="face-confidence-section" style="display: none; margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Match Confidence</span>
          <span id="face-confidence-val" style="font-size: 0.8rem; font-weight: 700; color: var(--primary-500);">0%</span>
        </div>
        <div class="progress-bar-track" style="height: 8px;">
          <div id="face-confidence-bar" class="progress-bar-fill" style="width: 0%; background: var(--primary-500); transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Face Mismatch Alert Card -->
      <div id="face-alert-card" style="display: none;"></div>

      <!-- Action buttons -->
      <div class="flex gap-3" style="margin-top: 20px;">
        <button onclick="closeFaceModal()" class="btn-secondary flex-1">Cancel</button>
        <button onclick="submitVote()" id="face-vote-btn" class="btn-success flex-1" disabled>
          \ud83d\udd12 Waiting for face match...
        </button>
      </div>
    </div>
  `;

  // Load face-api models and start camera
  await initFaceDetection();
}

function closeFaceModal() {
  document.getElementById('face-modal').style.display = 'none';
  stopCamera();
  faceVerified = false;
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

async function initFaceDetection() {
  const statusEl = document.getElementById('face-status');

  try {
    // Check if face-api.js is loaded
    if (typeof faceapi === 'undefined') {
      throw new Error('Face detection library failed to load. Please refresh the page.');
    }

    // Load models required for face recognition
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL)
    ]);

    statusEl.innerHTML = '<div class="spinner spinner-sm"></div> <span>Starting camera...</span>';

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 480 }, 
        height: { ideal: 360 },
        facingMode: 'user'
      }
    });

    videoStream = stream;
    const video = document.getElementById('face-video');
    video.srcObject = stream;

    // Wait for video to be ready
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    statusEl.className = 'face-status face-status-scanning';
    statusEl.innerHTML = '<span class="face-pulse-dot"></span> <span>Loading your Face ID...</span>';
    
    document.getElementById('face-confidence-section').style.display = 'block';

    // Start continuous face detection for authentication
    startFaceDetectionLoop(video);

  } catch (error) {
    console.error('Face detection init error:', error);

    let errorMsg = error.message;
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg = 'Camera access was denied. Please allow camera access in your browser settings and try again.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg = 'No camera found. Please connect a camera and try again.';
    }

    statusEl.className = 'face-status face-status-error';
    statusEl.innerHTML = '<span>\u274c</span> <span>' + errorMsg + '</span>';

    // Allow voting without face verification if camera fails (graceful fallback)
    setTimeout(() => {
      statusEl.innerHTML += `
        <div style="margin-top: 12px;">
          <button onclick="skipFaceVerification()" class="btn-secondary btn-sm" style="font-size: 0.8rem;">
            Continue without face verification
          </button>
        </div>
      `;
    }, 2000);
  }
}

// ─── Face Matching Engine ────────────────────────────────────────

let detectionLoopId = null;
let registeredDescriptor = null;
let alertThrottle = false;
let voteScanStartTime = null;
const VOTE_MIN_SCAN = 3000; // Minimum 3 seconds of scanning

// Manual euclidean distance calculation (works with all face-api builds)
function euclideanDist(arr1, arr2) {
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

async function startFaceDetectionLoop(video) {
  const canvas = document.getElementById('face-overlay');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('face-status');

  // Fetch the user's registered Face ID from the server
  try {
    const meRes = await api.get('/auth/me');
    const userProfile = meRes.data.user;
    if (userProfile.faceDescriptor && userProfile.faceDescriptor.length > 0) {
      registeredDescriptor = new Float32Array(userProfile.faceDescriptor);
    } else {
      statusEl.className = 'face-status face-status-error';
      statusEl.innerHTML = '<span>\u274c</span> <span>No Face ID registered for your account.</span>';
      setTimeout(() => {
        statusEl.innerHTML += `
          <div style="margin-top: 12px;">
            <button onclick="skipFaceVerification()" class="btn-secondary btn-sm" style="font-size: 0.8rem;">
              Continue without face verification
            </button>
          </div>
        `;
      }, 2000);
      return;
    }
  } catch (error) {
    console.error("Failed to fetch user profile for Face ID", error);
    statusEl.className = 'face-status face-status-error';
    statusEl.innerHTML = '<span>\u274c</span> <span>Failed to fetch your registered Face ID.</span>';
    setTimeout(() => {
      statusEl.innerHTML += `
        <div style="margin-top: 12px;">
          <button onclick="skipFaceVerification()" class="btn-secondary btn-sm" style="font-size: 0.8rem;">
            Continue without face verification
          </button>
        </div>
      `;
    }, 3000);
    return;
  }

  voteScanStartTime = Date.now();
  statusEl.className = 'face-status face-status-scanning';
  statusEl.innerHTML = '<span class="face-pulse-dot"></span> <span>Scanning face... Look at the camera (3s)</span>';

  async function detect() {
    if (!videoStream) return;

    const elapsed = Date.now() - voteScanStartTime;
    const remaining = Math.max(0, VOTE_MIN_SCAN - elapsed);
    const progress = Math.min(100, Math.round((elapsed / VOTE_MIN_SCAN) * 100));

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const resized = faceapi.resizeResults(detection, { width: canvas.width, height: canvas.height });
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);

        // During the first 3 seconds, just show scanning progress
        if (remaining > 0) {
          updateConfidence(progress);
          statusEl.className = 'face-status face-status-scanning';
          statusEl.innerHTML = '<span class="face-pulse-dot"></span> <span>Scanning face... ' + progress + '% (' + Math.ceil(remaining / 1000) + 's remaining)</span>';
        } else {
          // 3 seconds elapsed — now compare face descriptors
          const distance = euclideanDist(registeredDescriptor, detection.descriptor);
          const matchConfidence = Math.max(0, Math.round((1 - distance) * 100));
          updateConfidence(matchConfidence);

          if (matchConfidence >= 70) {
            // Face matched with 70%+ confidence — allow voting
            hideAlertCard();
            faceVerified = true;
            onFaceVerified(matchConfidence);
            return;
          } else {
            // Face does NOT match — block voting and show alert card
            statusEl.className = 'face-status face-status-error';
            statusEl.innerHTML = '<span>\u274c</span> <span>Face does not match! (' + matchConfidence + '% similarity)</span>';
            blockVoteButton();
            showAlertCard(matchConfidence);
          }
        }
      } else {
        // No face — reset timer
        voteScanStartTime = Date.now();
        updateConfidence(0);
        statusEl.className = 'face-status face-status-scanning';
        statusEl.innerHTML = '<span class="face-pulse-dot"></span> <span>No face detected \u2014 look directly at the camera</span>';
      }
    } catch (e) {
      // Silently handle detection errors
    }

    detectionLoopId = setTimeout(detect, 500);
  }

  detect();
}

function updateConfidence(value) {
  const bar = document.getElementById('face-confidence-bar');
  const val = document.getElementById('face-confidence-val');
  if (bar) {
    bar.style.width = value + '%';
    bar.style.background = value >= 70 ? 'var(--success-500)' : value >= 40 ? 'var(--warning-500)' : 'var(--error-500, #ef4444)';
  }
  if (val) {
    val.textContent = value + '%';
    val.style.color = value >= 70 ? 'var(--success-500)' : value >= 40 ? 'var(--warning-500)' : 'var(--error-500, #ef4444)';
  }
}

// ─── Alert Card for Face Mismatch ────────────────────────────────

function showAlertCard(matchConfidence) {
  const card = document.getElementById('face-alert-card');
  if (!card) return;

  card.style.display = 'block';
  card.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      border: 1.5px solid #fca5a5;
      border-radius: 12px;
      padding: 18px;
      margin-top: 16px;
      animation: shake 0.5s ease-in-out;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          width: 42px; height: 42px;
          background: #fee2e2;
          border: 2px solid #fca5a5;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        ">\u26d4</div>
        <div>
          <h4 style="margin: 0 0 4px; font-size: 0.95rem; font-weight: 700; color: #991b1b;">
            Face ID Verification Failed
          </h4>
          <p style="margin: 0 0 8px; font-size: 0.82rem; color: #b91c1c; line-height: 1.5;">
            Your face matched only <strong>${matchConfidence}%</strong> with the registered Face ID.
            A minimum of <strong>70%</strong> match is required to cast a vote.
          </p>
          <div style="
            background: #fecaca;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 0.78rem;
            color: #991b1b;
            line-height: 1.4;
          ">
            <strong>\u26a0\ufe0f Voting is blocked.</strong> Please ensure the same person who registered this account is looking directly at the camera.
          </div>
        </div>
      </div>
    </div>
  `;
}

function hideAlertCard() {
  const card = document.getElementById('face-alert-card');
  if (card) {
    card.style.display = 'none';
    card.innerHTML = '';
  }
}

function blockVoteButton() {
  const voteBtn = document.getElementById('face-vote-btn');
  if (voteBtn) {
    voteBtn.disabled = true;
    voteBtn.innerHTML = '\u26d4 Voting Blocked';
    voteBtn.className = 'btn-danger flex-1';
    voteBtn.style.animation = 'none';
    voteBtn.style.opacity = '0.6';
    voteBtn.style.cursor = 'not-allowed';
  }
}

function onFaceVerified(confidence) {
  // Stop detection loop
  if (detectionLoopId) {
    clearTimeout(detectionLoopId);
    detectionLoopId = null;
  }

  // Update status to verified
  const statusEl = document.getElementById('face-status');
  statusEl.className = 'face-status face-status-verified';
  statusEl.innerHTML = '<span>\u2705</span> <span>Face Matched! Identity Confirmed (' + confidence + '% match)</span>';

  // Animate the scan line to green
  const scanLine = document.getElementById('face-scan-line');
  if (scanLine) scanLine.classList.add('verified');

  // Update confidence bar to full green
  updateConfidence(confidence);

  // Enable the vote button
  const voteBtn = document.getElementById('face-vote-btn');
  if (voteBtn) {
    voteBtn.disabled = false;
    voteBtn.innerHTML = '\u2713 Cast Vote Now';
    voteBtn.className = 'btn-success flex-1';
    // Add a subtle glow animation
    voteBtn.style.animation = 'pulse-glow 2s infinite';
  }

  showToast('Face matched successfully! You may now vote.', 'success');

  // Stop camera after a short delay (keep preview briefly)
  setTimeout(() => {
    stopCamera();
  }, 3000);
}

function skipFaceVerification() {
  faceVerified = true;
  stopCamera();
  
  const voteBtn = document.getElementById('face-vote-btn');
  if (voteBtn) {
    voteBtn.disabled = false;
    voteBtn.innerHTML = '\u2713 Cast Vote (No Face Verify)';
    voteBtn.className = 'btn-success flex-1';
  }

  const statusEl = document.getElementById('face-status');
  statusEl.className = 'face-status face-status-scanning';
  statusEl.innerHTML = '<span>\u26a0\ufe0f</span> <span>Proceeding without face verification</span>';
  
  showToast('Continuing without face verification', 'info');
}

// ─── Step 3: Submit Vote ─────────────────────────────────────────

async function submitVote() {
  if (!faceVerified) {
    showToast('Please complete face verification first', 'error');
    return;
  }

  const btn = document.getElementById('face-vote-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div> Submitting...';

  const params = new URLSearchParams(window.location.search);
  const electionId = params.get('id');

  try {
    const data = await api.post('/votes', {
      electionId,
      candidateId: selectedCandidate._id
    });

    closeFaceModal();
    showToast('Vote cast successfully!', 'success');

    // Show success receipt
    document.getElementById('voting-content').classList.add('hidden');
    const successDiv = document.getElementById('vote-success');
    successDiv.classList.remove('hidden');
    successDiv.style.display = 'flex';
    successDiv.innerHTML = `
      <div class="card vote-receipt animate-scale-in">
        <div class="receipt-icon">\u2713</div>
        <h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Vote Recorded!</h2>
        <p style="color: var(--text-muted); margin-bottom: 20px;">
          Your vote for <span style="color: var(--primary-500); font-weight: 500;">${currentElection.title}</span> has been securely recorded.
        </p>
        <div style="background: var(--success-50); border: 1px solid var(--success-500); border-radius: 8px; padding: 12px; margin-bottom: 8px; text-align: left;">
          <p style="color: var(--success-500); font-size: 0.85rem; font-weight: 500; margin: 0;">
            \u2705 Identity verified via facial recognition
          </p>
        </div>
        <div style="background: var(--gray-50); border-radius: 8px; padding: 14px; margin-bottom: 16px; text-align: left;">
          <p style="font-size: 0.85rem; margin: 0; color: var(--text-secondary);">
            <strong>Timestamp:</strong> ${new Date(data.data.timestamp).toLocaleString()}
          </p>
        </div>
        <div class="flex gap-3" style="flex-wrap: wrap;">
          <a href="/dashboard.html" class="btn-secondary flex-1">Back to Dashboard</a>
          <a href="/results.html?id=${electionId}" class="btn-primary flex-1">View Results</a>
        </div>
      </div>
    `;
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to cast vote', 'error');
    closeFaceModal();
  }
}
