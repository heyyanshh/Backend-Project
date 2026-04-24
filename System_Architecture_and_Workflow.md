# E-Vote System: Architecture & Workflow Documentation

This document provides a complete, end-to-end explanation of how the E-Vote System works, from the frontend user interface down to the backend database and the biometric facial recognition engine.

---

## 1. System Architecture (The Tech Stack)
The project is built using a modern JavaScript stack, separated into two main layers:

*   **Frontend (Client-Side):** Built with pure HTML, CSS, and Vanilla JavaScript. It doesn't use frameworks like React or Angular, making it lightweight and extremely fast. It communicates with the backend using a custom `api.js` wrapper around the `fetch` API.
*   **Backend (Server-Side):** Built with Node.js and Express.js. It handles routing, business logic, security authentication (JWT), and database connections.
*   **Database:** MongoDB, a NoSQL database, accessed via the Mongoose ODM (Object Data Modeling) library.

---

## 2. Database Schema & Storage
The application stores data locally in a MongoDB database named `evote`. The data is structured into four main collections (tables):

### A. Users Collection (`models/User.js`)
*   Stores information for both `voter` and `admin` roles.
*   Passwords are never stored in plain text; they are encrypted using **bcrypt**.
*   **Biometric Data:** When a user registers their Face ID, the browser generates a `faceDescriptor` (a mathematical array of 128 numbers mapping their facial features). This array is saved in the database. **No actual photos or videos are ever saved to the server**, ensuring strict privacy.

### B. Elections Collection (`models/Election.js`)
*   Managed exclusively by the Admin.
*   Contains the election `title`, `description`, `startDate`, and `endDate`.
*   Contains an embedded array of `candidates` (Name, Party, Manifesto).
*   The system automatically calculates whether an election is `upcoming`, `active`, or `completed` based on the current date relative to the start/end dates.

### C. Votes Collection (`models/Vote.js`)
*   This is the core ledger of the application.
*   When a vote is cast, it creates a record linking the `electionId`, `candidateId`, and `userId`.
*   **Blockchain-inspired Security:** Every vote generates a `voteHash` using the SHA-256 cryptographic algorithm. This hash is created using the voter's ID, the candidate's ID, and the exact timestamp. If anyone were to manually tamper with the database, the hash would invalidate, proving the system's integrity.

### D. AuditLogs Collection (`models/AuditLog.js`)
*   Tracks system events (e.g., logins, registrations, vote casting, election creation).
*   Records the action, the user who performed it, their IP address, and the timestamp. This provides a paper trail for the Admin.

---

## 3. Facial Recognition Engine (How it Works)
The biometric authentication is powered by `face-api.js` (specifically the optimized Vladmandic fork), running entirely locally in the user's browser.

**Phase 1: Registration**
1. The user fills out their details and clicks Register.
2. The browser requests webcam access and loads three lightweight AI models (TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet) directly from a CDN.
3. The user looks at the camera for a minimum of 3 seconds. The AI detects the face, maps 68 facial landmarks (eyes, nose, mouth geometry), and mathematically extracts a 128-dimensional array known as the `faceDescriptor`.
4. This descriptor is sent to the backend and saved in the database alongside their account.

**Phase 2: Voting Authentication (1:1 Matching)**
1. When the user attempts to cast a vote, the server sends their previously saved `faceDescriptor` back to their browser.
2. The webcam turns on and scans the user's live face, generating a *new* live descriptor.
3. The system calculates the **Euclidean Distance** between the registered descriptor and the live descriptor.
4. If the distance translates to a match confidence of **70% or higher**, the system verifies the identity, unlocks the vote button, and allows the vote to proceed. If it is below 70%, voting is strictly blocked.

---

## 4. Application Workflow (Step-by-Step)

1.  **Registration & Biometrics:** User visits `/register.html`, enters details, scans their face, and the data is saved to MongoDB. The system does *not* auto-login, forcing a secure authentication loop.
2.  **Login:** User visits `/index.html`, enters their email and password. The backend verifies the password using bcrypt. If correct, it generates a **JWT (JSON Web Token)**. This token is stored securely in the browser's cookies and local storage to keep the user logged in.
3.  **Dashboard (`/dashboard.html`):** The user sees a greeting, their unique Voter ID, and a categorized list of elections (Active, Upcoming, Completed).
4.  **Voting (`/vote.html`):** The user selects an active election, chooses a candidate, and clicks vote. The Face ID modal appears. The user must pass the 70% biometric threshold.
5.  **Vote Submission:** Once verified, the vote is sent to the backend. The backend checks if the user has already voted in this election. If not, the vote is saved, a cryptographic hash is generated, and a confirmation email receipt is sent via Nodemailer.
6.  **Results (`/results.html`):** After voting (or if an election is completed), users can view real-time pie charts and bar graphs of the results, rendered dynamically using Chart.js.

---

## 5. Security & Features Summary
*   **RBAC (Role-Based Access Control):** Admins and Voters have completely separate dashboards and permissions.
*   **Biometric MFA:** 1:1 local facial recognition prevents identity fraud.
*   **Cryptographic Integrity:** SHA-256 vote hashing prevents database tampering.
*   **Privacy-First AI:** All facial recognition processing happens locally in the browser; images never touch the server.
*   **Real-time Analytics:** Socket.io is implemented on the backend to allow real-time updates for live elections without refreshing the page.
