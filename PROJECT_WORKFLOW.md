# 🗳️ E-Vote System — Complete Project Workflow Guide

> **Full-Stack Secure Electronic Voting System** with Blockchain Hash Chain, Real-Time Updates, AI Analytics, MFA, Facial Recognition, and Email Notifications.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Feature List](#feature-list)
5. [Backend Workflow](#backend-workflow)
6. [Frontend Workflow](#frontend-workflow)
7. [Security Features](#security-features)
8. [How Each Feature Works](#how-each-feature-works)
9. [API Reference](#api-reference)
10. [Setup & Configuration](#setup--configuration)
11. [File Structure](#file-structure)

---

## 🎯 Project Overview

The E-Vote System is a full-stack web application that allows secure, transparent electronic voting. It features:

- **Blockchain-like SHA-256 Hash Chain** for vote integrity
- **Role-Based Access Control (RBAC)** — Admin vs. Voter
- **Real-Time Dashboard Updates** via WebSockets (Socket.io)
- **Multi-Factor Authentication** with email OTP
- **Facial Recognition & Liveness Detection** (anti-fraud)
- **Email Notifications** for registration and vote receipts
- **Public Verification Portal** for transparent vote checking
- **AI-Powered Election Analytics** with intelligent insights
- **Export Results** to CSV/PDF

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla HTML/CSS/JS | UI without frameworks for simplicity |
| **Backend** | Node.js + Express.js | REST API server |
| **Database** | MongoDB + Mongoose | Data persistence with ODM |
| **Real-Time** | Socket.io | Live dashboard updates |
| **Email** | Nodemailer | Transactional emails (welcome, OTP, vote receipt) |
| **Charts** | Chart.js | Data visualization for results & analytics |
| **Security** | JWT + bcrypt + Helmet | Authentication, hashing, HTTP headers |
| **Face Detection** | face-api.js (TensorFlow.js) | Client-side facial recognition & liveness |
| **Hashing** | Node.js `crypto` (SHA-256) | Blockchain-like vote chain |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Login/  │  │ Voter    │  │ Admin   │  │ Public Verify    │  │
│  │ Register│  │ Dashboard│  │ Panel   │  │ Portal           │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └───────┬──────────┘  │
│       │            │             │                │              │
│       └────────────┴──────┬──────┴────────────────┘              │
│                           │ REST API + WebSocket                 │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                     EXPRESS.JS SERVER                             │
│  ┌──────────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Auth         │  │ Vote     │  │ Election  │  │ Admin      │  │
│  │ Controller   │  │ Controller│  │ Controller│  │ Controller │  │
│  │ (+ OTP/MFA) │  │ (+ Email)│  │           │  │ (+ AI)     │  │
│  └──────┬───────┘  └─────┬────┘  └─────┬─────┘  └─────┬──────┘  │
│         │                │             │               │          │
│  ┌──────┴────────────────┴─────────────┴───────────────┴───────┐ │
│  │                    MIDDLEWARE LAYER                          │ │
│  │  auth.js │ rbac.js │ validate.js │ rateLimiter.js           │ │
│  └────────────────────────────────────────────────────┬────────┘ │
│                                                       │          │
│  ┌────────────────────────────────────────────────────┴────────┐ │
│  │                    UTILITY LAYER                            │ │
│  │  hashChain.js │ emailService.js │ otpService.js │analytics.js│ │
│  └────────────────────────────────────────────────────┬────────┘ │
│                                                       │          │
│  ┌────────────────────┐    ┌──────────────────────────┘────────┐ │
│  │   Socket.io Server │    │         MongoDB (Mongoose)        │ │
│  │   (Real-Time)      │    │  Users │ Elections │ Candidates   │ │
│  │                    │    │  Votes │ AuditLogs │ OTPs         │ │
│  └────────────────────┘    └───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✨ Feature List

### 🟢 Easy Features (Implemented)
| # | Feature | Status |
|---|---------|--------|
| 1 | **Email Notifications & Receipts** (Nodemailer) | ✅ Done |
| 2 | **Export Results to PDF/CSV** | ✅ Done |
| 3 | **Public Verification Portal** | ✅ Done |

### 🟡 Medium Features (Implemented)
| # | Feature | Status |
|---|---------|--------|
| 4 | **Real-Time Dashboard Updates** (Socket.io) | ✅ Done |
| 5 | **Multi-Factor Authentication** (OTP via Email) | ✅ Done |

### 🔴 Advanced Features (Implemented)
| # | Feature | Status |
|---|---------|--------|
| 7 | **Facial Recognition & Liveness Detection** (face-api.js) | ✅ Done |
| 9 | **AI-Powered Election Analytics** | ✅ Done |

---

## ⚙️ Backend Workflow

### 1. Server Startup (`server.js`)

```
Start → Load .env → Initialize Express → Create HTTP Server
    → Initialize Socket.io → Connect MongoDB
    → Apply Middleware (helmet, cors, rate-limiter, cookie-parser)
    → Register API Routes → Start Listening
    → Seed Default Admin (admin@evote.com / Admin@123)
```

### 2. Authentication Flow

#### Standard Login (MFA Disabled):
```
Client sends POST /api/auth/login {email, password}
    → Middleware: Rate Limiter → Validation
    → Find user in DB → Compare password (bcrypt)
    → Generate JWT token → Set HTTP-only cookie
    → Return {user, token}
```

#### Login with MFA/OTP (MFA Enabled):
```
Client sends POST /api/auth/login {email, password}
    → Validate credentials → MFA_ENABLED = true
    → Generate 6-digit OTP → Save to DB (5-min expiry)
    → Send OTP via email (Nodemailer)
    → Return {requiresOTP: true, userId}

Client sends POST /api/auth/verify-otp {userId, otpCode}
    → Find valid OTP in DB → Verify not expired
    → Mark OTP as used → Generate JWT token
    → Return {user, token}
```

#### Registration:
```
Client sends POST /api/auth/register {name, email, password}
    → Validate → Check for duplicate email
    → Hash password (bcrypt, 12 rounds) → Generate Voter ID (VID-XXXXXX)
    → Save to DB → Generate JWT → Set cookie
    → Send Welcome Email (async, non-blocking)
    → Create Audit Log (USER_REGISTERED)
    → Return {user, token}
```

### 3. Voting Flow (The Core)

```
FRONTEND (Browser):
    Step A: Voter selects candidate → clicks "Confirm Vote"
    Step B: Confirmation modal explains facial verification requirement
    Step C: Webcam opens → face-api.js loads TinyFaceDetector model
    Step D: Continuous detection loop (~2 fps) with bounding box + landmarks
    Step E: 5 consecutive confident detections (≥70%) = Liveness Verified
    Step F: Vote button unlocked → Voter clicks "Cast Vote Now"

BACKEND (Server):
Client sends POST /api/votes {electionId, candidateId}
    → auth middleware → RBAC (voter only) → Rate limiter → Validation
    
    Step 1: Verify election exists and is 'active'
    Step 2: Verify candidate belongs to this election
    Step 3: Check for duplicate vote (unique compound index)
    Step 4: Get the LAST vote's hash in the chain → previousHash
    Step 5: Create SHA-256 hash:
            hash = SHA256(electionId + voterId + candidateId + timestamp + previousHash)
    Step 6: Save vote record {election, voter, candidate, previousHash, hash, timestamp}
    Step 7: Increment candidate voteCount and election totalVotes
    Step 8: Create Audit Log (VOTE_CAST)
    Step 9: Send Vote Receipt Email (async, non-blocking)
    Step 10: Emit Socket.io event 'vote_cast' → All connected clients update
    
    → Return {voteHash, timestamp, electionTitle}
```

### 4. Hash Chain Verification

```
GET /api/votes/verify/:electionId (Admin only)
    → Fetch all votes for election (sorted by timestamp ASC)
    → For each vote[i]:
        1. Check vote[i].previousHash === vote[i-1].hash (or '0' for first)
        2. Recalculate hash from raw data
        3. Compare recalculated hash with stored hash
    → If any mismatch: chain is BROKEN (tampering detected)
    → If all match: chain is VALID (integrity intact)
```

### 5. Public Vote Verification

```
POST /api/votes/public-verify {voteHash}    ← NO AUTH REQUIRED
    → Search DB for vote with matching hash
    → If found: recalculate hash from stored data
    → Compare recalculated vs stored
    → Return: exists, isIntact, electionTitle, timestamp
```

### 6. AI Analytics Engine

```
GET /api/admin/analytics/:electionId (Admin only)
    → Aggregate all votes for election
    → Calculate:
        1. Voter Turnout (votes / registered voters × 100)
        2. Peak Voting Hours (group by hour)
        3. Voting Velocity (votes per hour over time)
        4. Cumulative Votes (running total)
        5. Candidate Margin Analysis (lead gap)
        6. Competitiveness Rating (Very Close / Competitive / Moderate / Dominant)
    → Generate AI Insights (text-based recommendations)
    → Return structured analytics data
```

### 7. Export Results

```
GET /api/votes/export/:electionId?format=csv (Admin only)
    → Fetch election + candidates + vote counts
    → Calculate percentages, turnout, winner
    → If format=csv: Generate CSV text → Download as file
    → If format=json: Return structured JSON (for PDF generation on client)
```

---

## 🎨 Frontend Workflow

### Page Flow (User Journey)

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Login Page  │────>│  OTP Page    │────>│  Dashboard      │
│  index.html  │     │  (if MFA on) │     │  dashboard.html │
└──────────────┘     └──────────────┘     └────────┬────────┘
        │                                          │
        │     ┌────────────────────────────────────┤
        │     │                                    │
        ▼     ▼                                    ▼
┌──────────────┐     ┌─────────────────┐  ┌──────────────────┐
│  Register    │     │  Vote Page      │  │  Results Page    │
│  register.   │     │  vote.html      │  │  results.html    │
│  html        │     │  (Select+Confirm│  │  (Charts, Table) │
└──────────────┘     └─────────────────┘  └──────────────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │                 │
                                          ▼                 ▼
                                   ┌────────────┐  ┌──────────────┐
                                   │  Analytics │  │  Verify      │
                                   │  analytics │  │  verify.html │
                                   │  .html     │  │  (Public)    │
                                   └────────────┘  └──────────────┘
```

### Admin Flow

```
Login → Admin Dashboard (stats overview)
    ├── Elections Management → Create Election → Add Candidates → Start → End
    ├── AI Analytics → Select Election → View Insights, Charts, Export
    ├── Audit Logs → Filter by action → Paginate
    ├── Results → Charts + Table + Export CSV/PDF
    └── Verify Vote → Paste hash → Check integrity
```

### Voter Flow

```
Register/Login → Voter Dashboard (see elections)
    ├── Cast Vote → Select Election → Pick Candidate → Face Scan → Confirm → Receipt
    ├── View Results → Charts + Rankings
    └── Verify Vote → Paste hash → Independent confirmation
```

### Real-Time Updates (Socket.io)

```
When a vote is cast:
    Server → io.emit('vote_cast', {electionId, candidates, totalVotes})
    
    All connected clients on Results page:
        → socket.on('vote_cast') → Refresh charts & tables automatically
        → Show toast: "📊 Results updated in real-time!"
    
    Live indicator: Green pulsing dot shown on active elections
```

---

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcrypt with 12 salt rounds |
| **JWT Authentication** | HTTP-only cookies + Bearer tokens |
| **Rate Limiting** | General: 5000/15min, Auth: 500/15min, Vote: 200/min |
| **Input Validation** | express-validator on all endpoints |
| **RBAC** | Role-based middleware (admin / voter) |
| **HTTP Security** | Helmet.js (HSTS, XSS, CSP, etc.) |
| **Hash Chain** | SHA-256 blockchain-like vote integrity |
| **MFA/OTP** | 6-digit email OTP with 5-minute expiry |
| **Facial Recognition** | face-api.js liveness detection (client-side, zero data sent) |
| **Duplicate Prevention** | Unique compound index (voter + election) |
| **Audit Trail** | Every action logged with timestamp + IP |

---

## 🔧 How Each Feature Works

### Feature 1: Email Notifications (Nodemailer)

**File:** `utils/emailService.js`

- Uses Nodemailer with configurable SMTP transport
- Falls back to **Ethereal** test accounts in development (no real SMTP needed)
- Sends 3 types of emails:
  1. **Welcome Email** — on user registration (includes Voter ID)
  2. **Vote Receipt** — after casting a vote (includes vote hash as digital receipt)
  3. **OTP Code** — for multi-factor authentication login

**How it works:**
```
User registers → authController.register() 
    → sendWelcomeEmail(user) runs asynchronously (non-blocking)
    → In dev mode, preview URL is logged to server console

User votes → voteController.castVote()
    → sendVoteReceipt(user, {hash, election, timestamp})
    → Email contains the vote hash as a digital receipt
```

### Feature 2: Export Results to PDF/CSV

**Backend:** `controllers/voteController.js → exportResults()`  
**Frontend:** `public/js/results.js`, `public/js/analytics.js`

- **CSV Export:** Server generates CSV text and sends as downloadable file
- **PDF Export:** Uses `window.print()` with CSS `@media print` styles that hide sidebar/buttons

**How it works:**
```
Admin clicks "Export CSV" → GET /api/votes/export/:id?format=csv
    → Server queries election + candidates
    → Generates: Rank, Candidate, Party, Votes, Percentage
    → Sets Content-Type: text/csv → Browser downloads file

Admin clicks "Export PDF" → window.print() triggered
    → CSS print styles hide navigation, sidebar, buttons
    → Charts and tables remain visible for clean print output
```

### Feature 3: Public Verification Portal

**Backend:** `controllers/voteController.js → publicVerifyVote()`  
**Frontend:** `public/verify.html`  
**Route:** `POST /api/votes/public-verify` — **NO AUTH REQUIRED**

**How it works:**
```
Any person visits /verify.html (no login needed)
    → Pastes their 64-character SHA-256 vote hash
    → POST /api/votes/public-verify {voteHash}
    → Server searches DB for matching hash
    → If found: recalculates hash from raw data to check integrity
    → Returns: exists (yes/no), isIntact (not tampered), election name, timestamp
```

**Why it matters:** Voters can independently prove their vote was recorded without trusting the admin. This is the transparency cornerstone of the system.

### Feature 4: Real-Time Dashboard Updates (Socket.io)

**Backend:** `server.js` (Socket.io server), `controllers/voteController.js` (emit events)  
**Frontend:** `public/js/results.js` (listen for events)

**How it works:**
```
Server initializes Socket.io alongside Express
    → Socket.io attached to HTTP server
    → Accessible in controllers via req.app.get('io')

When a vote is cast:
    → voteController emits io.emit('vote_cast', {...})
    → All connected browsers receive the event instantly
    → Results page: chart.js data is refreshed, table re-renders
    → Toast notification appears: "📊 Results updated in real-time!"

Live Indicator:
    → Active elections show a pulsing green dot with "Live Updates" text
    → Uses CSS @keyframes pulse animation
```

### Feature 5: Multi-Factor Authentication (OTP)

**Backend:** `utils/otpService.js`, `models/OTP.js`, `controllers/authController.js`  
**Frontend:** `public/js/login.js`  
**Toggle:** Set `MFA_ENABLED=true` in `.env`

**How it works:**
```
Step 1: User submits email + password
    → Server validates credentials
    → If MFA_ENABLED=true:
        → Generate random 6-digit code (crypto.randomInt)
        → Save to DB with 5-minute TTL (auto-delete via MongoDB TTL index)
        → Send via email (Nodemailer)
        → Return {requiresOTP: true, userId}

Step 2: Frontend switches to OTP input form
    → User enters 6-digit code from email
    → POST /api/auth/verify-otp {userId, otpCode}
    → Server checks: code matches, not expired, not already used
    → Mark OTP as used → Generate JWT → Login complete

Resend: POST /api/auth/resend-otp → Invalidates old OTPs, sends new one
```

### Feature 7: Facial Recognition & Liveness Detection (Anti-Fraud)

**Library:** `face-api.js` (built on TensorFlow.js)  
**Frontend:** `public/vote.html`, `public/js/vote.js`  
**Backend:** None required — **runs entirely in the browser!**

**Privacy:** Zero images are stored or transmitted. All processing happens locally in the voter's browser via WebGL/Canvas.

**How it works:**
```
Step 1: Voter selects candidate → clicks "Confirm Vote"
    → Confirmation modal explains face verification requirement
    → Voter clicks "Proceed to Face Scan"

Step 2: Face Verification Modal opens
    → face-api.js loads TinyFaceDetector model (~190KB from CDN)
    → Browser requests camera access (getUserMedia API)
    → Webcam feed displayed with sci-fi corner markers + scanning line animation

Step 3: Continuous Detection Loop (~2 fps)
    → Each frame: faceapi.detectAllFaces() with TinyFaceDetector
    → If face found:
        → Draw bounding box (green if > 85% confidence, blue otherwise)
        → Draw 68 facial landmarks (eyes, nose, mouth mesh)
        → Update confidence meter bar (0-100%)
    → If no face: status shows "No face detected — look at camera"

Step 4: Liveness Verification
    → Need 5 consecutive frames with ≥ 70% detection confidence
    → This takes ~2.5 seconds of steady face presence
    → Prevents spoofing with photos (too brief, too low-res)
    → Progress shown: "Verifying liveness... 60%"

Step 5: Verification Complete
    → Status turns green: "✅ Face verified! Confidence: 92%"
    → Vote button unlocked with pulse-glow animation
    → Camera stops after 3 seconds
    → Voter clicks "Cast Vote Now" → API call proceeds

Graceful Fallback:
    → If camera denied or not available:
        → Error message displayed
        → After 2 seconds, "Continue without face verification" button appears
        → Voter can still vote (accessibility-first approach)
```

**UI Elements:**
- 📸 Live webcam feed (mirrored for natural interaction)
- 🔲 Green/blue bounding box around detected face
- 🔵 68-point facial landmark mesh overlay
- 📊 Confidence percentage bar with color coding
- ⬇️ Animated scanning line (sci-fi aesthetic)
- 🟢 Corner markers framing the detection zone
- ✅ Pulse-glow button when verification succeeds

### Feature 9: AI-Powered Election Analytics

**Backend:** `utils/analytics.js`, `controllers/adminController.js → getAnalytics()`  
**Frontend:** `public/analytics.html`, `public/js/analytics.js`

**How it works:**
```
Admin navigates to /analytics.html → Selects an election
    → GET /api/admin/analytics/:electionId
    → Backend runs aggregation:

    1. VOTER TURNOUT
       votes.length / totalRegisteredVoters × 100

    2. PEAK VOTING HOURS
       Group votes by hour → Find hour with most votes

    3. VOTING VELOCITY
       Divide voting period into hourly buckets → Count votes per bucket

    4. CANDIDATE MARGIN ANALYSIS
       Sort candidates by votes → Calculate lead margin
       Classify: Very Close (<= 2) / Competitive (<= 5) / Moderate (<= 10) / Dominant

    5. AI INSIGHTS (Rule-Based Intelligence)
       → "Exceptional turnout at 85%!"
       → "Peak voting was 2PM-3PM with 15 votes"
       → "Race is Very Close, lead margin is 2 votes"
       → "Average voting rate: 8.5 votes/hour"

    Frontend renders with Chart.js:
       → Line chart: Voting velocity over time
       → Bar chart: Hour-wise distribution (peak highlighted)
       → Insight cards with contextual icons and colors
       → Candidate performance table
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new voter |
| POST | `/api/auth/login` | Public | Login (may return OTP requirement) |
| POST | `/api/auth/verify-otp` | Public | Verify OTP to complete MFA login |
| POST | `/api/auth/resend-otp` | Public | Resend OTP code |
| GET | `/api/auth/me` | Private | Get current user profile |
| POST | `/api/auth/logout` | Private | Logout (clear cookie) |

### Elections
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/elections` | Private | List all elections |
| GET | `/api/elections/:id` | Private | Get single election |
| POST | `/api/elections` | Admin | Create new election |
| PUT | `/api/elections/:id` | Admin | Update election |
| PUT | `/api/elections/:id/status` | Admin | Change status (upcoming→active→completed) |

### Voting
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/votes` | Voter | Cast a vote |
| GET | `/api/votes/status/:electionId` | Private | Check if user voted |
| GET | `/api/votes/verify/:electionId` | Admin | Verify hash chain integrity |
| POST | `/api/votes/public-verify` | **Public** | Verify a vote hash (no login) |
| GET | `/api/votes/export/:electionId` | Admin | Export results (CSV/JSON) |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/candidates` | Admin | Add candidate to election |
| DELETE | `/api/admin/candidates/:id` | Admin | Remove candidate |
| GET | `/api/admin/results/:electionId` | Private | Get election results |
| GET | `/api/admin/audit-logs` | Admin | View audit trail |
| GET | `/api/admin/stats` | Admin | System statistics |
| GET | `/api/admin/analytics/:electionId` | Admin | AI analytics for election |

---

## 🚀 Setup & Configuration

### Prerequisites
- Node.js v16+
- MongoDB running locally or Atlas URI

### Installation
```bash
cd "E-Vote System Project  copy"
npm install
```

### Environment Variables (`.env`)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/evote_simple
JWT_SECRET=evote_secure_secret_key_2024_production
JWT_EXPIRE=24h
NODE_ENV=development

# Email (leave blank for Ethereal test mode)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Multi-Factor Authentication
MFA_ENABLED=false   # Set to 'true' to enable OTP login
```

### Running
```bash
npm start          # Start the server
# Visit http://localhost:3000
```

### Default Admin
- **Email:** admin@evote.com
- **Password:** Admin@123

---

## 📁 File Structure

```
E-Vote System Project/
│
├── server.js                    # Entry point (Express + Socket.io + HTTP)
├── .env                         # Environment variables
├── package.json                 # Dependencies
│
├── config/
│   └── db.js                    # MongoDB connection
│
├── models/
│   ├── User.js                  # User schema (voter/admin)
│   ├── Election.js              # Election schema
│   ├── Candidate.js             # Candidate schema
│   ├── Vote.js                  # Vote schema (with hash chain)
│   ├── AuditLog.js              # Audit log schema
│   └── OTP.js                   # ⭐ NEW — OTP for MFA
│
├── controllers/
│   ├── authController.js        # ⭐ UPDATED — Login/Register + OTP/MFA + Email
│   ├── voteController.js        # ⭐ UPDATED — Voting + Email Receipt + Socket.io + Public Verify + Export
│   ├── electionController.js    # Election CRUD + status transitions
│   └── adminController.js       # ⭐ UPDATED — Candidates + Results + Audit + AI Analytics
│
├── routes/
│   ├── authRoutes.js            # ⭐ UPDATED — Added OTP routes
│   ├── voteRoutes.js            # ⭐ UPDATED — Added public-verify + export
│   ├── electionRoutes.js        # Election routes
│   └── adminRoutes.js           # ⭐ UPDATED — Added analytics route
│
├── middleware/
│   ├── auth.js                  # JWT verification middleware
│   ├── rbac.js                  # Role-Based Access Control
│   ├── validate.js              # Input validation rules
│   └── rateLimiter.js           # Rate limiting
│
├── utils/
│   ├── hashChain.js             # SHA-256 hash chain (create + verify)
│   ├── helpers.js               # Audit log + IP helpers
│   ├── emailService.js          # ⭐ NEW — Nodemailer (welcome, receipt, OTP emails)
│   ├── otpService.js            # ⭐ NEW — OTP generation & verification
│   └── analytics.js             # ⭐ NEW — AI analytics engine
│
├── public/
│   ├── index.html               # Login page
│   ├── register.html            # Registration page
│   ├── dashboard.html           # Voter dashboard
│   ├── admin.html               # Admin dashboard
│   ├── elections.html           # Election management (admin)
│   ├── vote.html                # ⭐ UPDATED — Voting page + face-api.js + face scan modal
│   ├── results.html             # ⭐ UPDATED — Real-time + Export buttons
│   ├── audit.html               # Audit logs (admin)
│   ├── verify.html              # ⭐ NEW — Public Verification Portal
│   ├── analytics.html           # ⭐ NEW — AI Analytics Dashboard
│   │
│   ├── css/
│   │   └── style.css            # ⭐ UPDATED — Pulse animation + Print styles + Face recognition UI
│   │
│   └── js/
│       ├── api.js               # Fetch wrapper + toast notifications
│       ├── auth.js              # ⭐ UPDATED — Sidebar with new nav items
│       ├── login.js             # ⭐ UPDATED — OTP flow for MFA
│       ├── register.js          # Registration logic
│       ├── dashboard.js         # Voter dashboard logic
│       ├── admin.js             # ⭐ UPDATED — Analytics button
│       ├── elections.js         # Election management logic
│       ├── vote.js              # ⭐ UPDATED — Facial recognition + webcam + liveness detection + verify link
│       ├── results.js           # ⭐ UPDATED — Socket.io + Export + Live indicator
│       ├── audit.js             # Audit log table + filters
│       └── analytics.js         # ⭐ NEW — AI analytics dashboard logic
│
└── PROJECT_WORKFLOW.md          # ⭐ This file — Full project documentation
```

---

## 🔄 Data Flow Summary

### Complete Vote Lifecycle:

```
1. Admin creates election → Adds candidates → Starts election (status: active)

2. Voter logs in → (Optional: OTP verification if MFA enabled)
   → Sees active elections on dashboard
   → Selects election → Picks candidate → Face scan verification → Confirms vote

3. Backend processes vote:
   → Validates election (active) + candidate (valid) + voter (not duplicate)
   → Gets previous hash from chain → Generates SHA-256 hash
   → Saves vote record → Increments counts
   → Sends email receipt → Emits Socket.io event → Creates audit log

4. Results page updates in real-time for all viewers

5. Admin ends election (status: completed) → Winner declared

6. Admin can:
   → View AI Analytics (turnout, peaks, competition, insights)
   → Export to CSV/PDF
   → Verify hash chain integrity

7. Anyone (even without login) can:
   → Go to /verify.html → Paste vote hash → Confirm vote exists and is untampered
```

---

## 🎓 Key Concepts Explained

### Blockchain-Like Hash Chain
Each vote's hash includes the previous vote's hash, creating an unbreakable chain. If anyone modifies a vote record, the hash changes, breaking the chain from that point forward. This is verified by `verifyChain()`.

### JWT Authentication
JSON Web Tokens are issued on login and stored as HTTP-only cookies (immune to XSS). The `protect` middleware decodes the JWT and attaches the user to `req.user`.

### Socket.io Real-Time
The server maintains WebSocket connections. When a vote is cast, the event is broadcast to all connected clients. The results page listens for these events and refreshes its charts automatically.

### Facial Recognition (face-api.js)
Uses TensorFlow.js-based face detection running entirely in the browser. The TinyFaceDetector model detects faces with bounding boxes and 68-point landmarks. Liveness is verified by requiring sustained detection (5 frames at ≥70% confidence). Zero images are stored or sent to any server — complete privacy by design.

### Rate Limiting
Prevents abuse by limiting request frequency per IP address. Auth endpoints are more strictly limited than general endpoints.

---

*Built with ❤️ as a B.Tech Semester Project — Demonstrating full-stack development, security best practices, and modern web technologies.*
