const express = require('express');
const router = express.Router();

// ─── E-Vote Chatbot Knowledge Base ─────────────────────────────────
const knowledgeBase = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good evening', 'howdy'],
    response: "Hello! 👋 I'm **EVA**, your E-Vote Assistant. I can help you with:\n\n• 🗳️ How to vote\n• 📋 Election information\n• 🔐 Account & security\n• ✅ Vote verification\n• 📊 Viewing results\n\nWhat would you like to know?"
  },
  {
    keywords: ['how to vote', 'cast vote', 'voting process', 'how do i vote', 'vote kaise', 'place vote', 'submit vote'],
    response: "Here's how to cast your vote:\n\n1️⃣ **Sign in** to your account\n2️⃣ Go to **Dashboard** → find an active election\n3️⃣ Click **\"Cast Vote\"** on the election card\n4️⃣ Review the candidates and select your choice\n5️⃣ **Facial verification** will confirm your identity\n6️⃣ Confirm and submit your vote ✅\n\n🔒 Your vote is encrypted and added to a tamper-proof hash chain."
  },
  {
    keywords: ['register', 'sign up', 'create account', 'new account', 'registration'],
    response: "To register on E-Vote:\n\n1️⃣ Click **\"Register here\"** on the login page\n2️⃣ Fill in your **name, email, and password**\n3️⃣ Capture your **facial biometric** via webcam\n4️⃣ Submit the registration form\n5️⃣ Log in with your credentials\n\n📸 Your face data is used for secure identity verification during voting."
  },
  {
    keywords: ['forgot password', 'reset password', 'change password', 'password reset', 'lost password'],
    response: "For password issues:\n\n🔑 Currently, please contact the **system administrator** at `admin@evote.com` to reset your password.\n\n💡 **Tip:** Passwords must be at least 6 characters and include a mix of letters, numbers, and special characters for security."
  },
  {
    keywords: ['face', 'facial', 'biometric', 'webcam', 'camera', 'face verification', 'face recognition'],
    response: "**Facial Verification** ensures only you can cast your vote:\n\n🔹 During **registration**, your face is captured as a reference\n🔹 When **voting**, your live face is matched against the stored reference\n🔹 A **70% confidence threshold** must be met\n🔹 The scan takes approximately **3 seconds**\n🔹 All processing runs **entirely in your browser** — no data leaves your device\n\n📸 Make sure you have good lighting and face the camera directly."
  },
  {
    keywords: ['security', 'secure', 'safe', 'hack', 'tamper', 'fraud', 'protect', 'encryption'],
    response: "E-Vote uses multiple layers of security:\n\n🔐 **JWT Authentication** — Secure session tokens\n🔗 **Hash Chain** — Each vote is linked cryptographically (like blockchain)\n📸 **Facial Biometrics** — Identity verification before voting\n🛡️ **Helmet.js** — HTTP security headers\n⏱️ **Rate Limiting** — Prevents brute-force attacks\n🍪 **Secure Cookies** — HttpOnly & SameSite protection\n\nYour vote is **anonymous** and **tamper-proof**!"
  },
  {
    keywords: ['hash chain', 'blockchain', 'chain', 'integrity', 'tamper proof', 'immutable'],
    response: "**Hash Chain Technology:**\n\nEach vote creates a cryptographic link to the previous vote:\n\n```\nVote #1 → hash_1\nVote #2 → hash(vote_2 + hash_1) → hash_2\nVote #3 → hash(vote_3 + hash_2) → hash_3\n```\n\n✅ If any vote is tampered with, the chain **breaks** — making fraud instantly detectable.\n\n🔍 You can verify the chain integrity in the **Audit Log** section."
  },
  {
    keywords: ['verify', 'verification', 'receipt', 'check vote', 'verify vote', 'confirm vote', 'track vote'],
    response: "To verify your vote was counted:\n\n1️⃣ After voting, you receive a **unique vote receipt hash**\n2️⃣ Go to the **\"Verify Vote\"** page (accessible without login)\n3️⃣ Enter your **receipt hash**\n4️⃣ The system confirms your vote exists in the chain ✅\n\n🔒 Verification is **anonymous** — it confirms the vote exists without revealing your choice."
  },
  {
    keywords: ['results', 'winner', 'who won', 'election results', 'outcome', 'standings'],
    response: "To view election results:\n\n📊 Go to **Results** from the sidebar\n📈 Results show **live vote counts** and percentages\n📋 You can **export results** as PDF or CSV\n\n⚠️ Results are available only after the election **end date** passes, or if the admin publishes them early."
  },
  {
    keywords: ['admin', 'administrator', 'manage', 'create election', 'add candidate'],
    response: "**Admin Features:**\n\n👤 Only admins can:\n• ➕ **Create** new elections with title, description & dates\n• 🧑 **Add candidates** to elections\n• 🚀 **Start/End** elections manually\n• 📊 **View analytics** and voter turnout\n• 📝 **Audit** the hash chain integrity\n• 👥 **Manage users** and roles\n\n🔑 Default admin: `admin@evote.com`"
  },
  {
    keywords: ['election', 'elections', 'active election', 'upcoming', 'current election', 'ongoing'],
    response: "**Election Types:**\n\n🟢 **Active** — Voting is currently open\n🟡 **Upcoming** — Election starts on the scheduled date\n🔵 **Completed** — Voting has ended, results available\n\n📍 Find all elections on your **Dashboard** or the **Elections** page.\n\nEach election has a title, description, start/end dates, and a list of candidates."
  },
  {
    keywords: ['audit', 'audit log', 'audit trail', 'log', 'transparency'],
    response: "The **Audit Log** provides complete transparency:\n\n📝 Every action is logged — vote cast, election created, etc.\n🔗 The **hash chain** can be verified for integrity\n🔍 Admins can view the full audit trail\n✅ A green checkmark means the chain is **intact**\n❌ A red flag means potential **tampering detected**\n\nThis ensures the election is fully transparent and trustworthy."
  },
  {
    keywords: ['analytics', 'statistics', 'stats', 'data', 'turnout', 'participation'],
    response: "**Election Analytics** include:\n\n📊 **Voter Turnout** — Percentage of registered voters who voted\n📈 **Vote Distribution** — Breakdown by candidate\n⏰ **Voting Timeline** — When votes were cast\n🏆 **Leading Candidates** — Real-time standings\n\n🤖 AI-powered insights help admins understand voting patterns and engagement."
  },
  {
    keywords: ['socket', 'real-time', 'realtime', 'live', 'live updates', 'notifications'],
    response: "**Real-Time Features:**\n\n⚡ E-Vote uses **Socket.io** for live updates:\n• 📊 Vote counts update **instantly** on the results page\n• 🔔 Dashboard stats refresh **automatically**\n• 🗳️ New votes are broadcast to all connected clients\n\nNo need to refresh — the data comes to you! 🚀"
  },
  {
    keywords: ['email', 'mail', 'notification', 'otp', 'mfa', 'two factor'],
    response: "**Email & Authentication:**\n\n📧 **Email notifications** are sent for important events\n🔐 **OTP (One-Time Password)** adds an extra security layer\n📱 **Multi-Factor Auth** can be enabled by the admin\n\nEmails are sent via **Nodemailer** — in development mode, test emails are captured via Ethereal."
  },
  {
    keywords: ['help', 'support', 'issue', 'problem', 'bug', 'error', 'not working', 'stuck'],
    response: "Need help? Here are some common solutions:\n\n🔧 **Can't log in?** — Check your email/password, clear cookies\n📸 **Camera not working?** — Allow browser camera permissions\n🗳️ **Can't vote?** — Ensure the election is active and you haven't already voted\n📊 **Results not showing?** — Election may still be active\n\n💬 Still stuck? Contact admin at `admin@evote.com`\n\nOr ask me a specific question — I'm here to help! 🤝"
  },
  {
    keywords: ['thank', 'thanks', 'bye', 'goodbye', 'see you', 'great', 'awesome', 'cool'],
    response: "You're welcome! 😊 Happy voting! 🗳️\n\nRemember — every vote counts in a democracy! If you need anything else, just click on me again. Have a great day! 🌟"
  },
  {
    keywords: ['who are you', 'what are you', 'your name', 'chatbot', 'bot', 'eva'],
    response: "I'm **EVA** — **E-Vote Virtual Assistant** 🤖\n\nI was built to help you navigate the E-Vote system. I can answer questions about:\n\n• Registration & Login\n• Voting process\n• Election management\n• Security features\n• Result verification\n• And much more!\n\nJust type your question and I'll do my best to help! 💬"
  }
];

// ─── Find best matching response ─────────────────────────────────
function findResponse(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Score each knowledge entry
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (lowerMessage.includes(keyword)) {
        // Longer keyword matches get higher scores
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.response;
  }

  // Default response
  return "I'm not sure about that, but I can help with:\n\n• 🗳️ **\"How to vote\"** — Voting process\n• 📋 **\"Elections\"** — Election information\n• 🔐 **\"Security\"** — How we protect your vote\n• ✅ **\"Verify vote\"** — Check your vote receipt\n• 📸 **\"Face verification\"** — Biometric info\n• 📊 **\"Results\"** — Viewing outcomes\n• 🔗 **\"Hash chain\"** — Integrity verification\n\nTry asking one of these topics! 💬";
}

// ─── POST /api/chatbot/message ──────────────────────────────────
router.post('/message', (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message too long. Please keep it under 500 characters.'
      });
    }

    const reply = findResponse(message);

    res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      message: 'Chatbot encountered an error. Please try again.'
    });
  }
});

// ─── GET /api/chatbot/suggestions ───────────────────────────────
router.get('/suggestions', (req, res) => {
  res.json({
    success: true,
    suggestions: [
      'How do I vote?',
      'Is my vote secure?',
      'How to verify my vote?',
      'What is hash chain?',
      'How to register?',
      'View election results'
    ]
  });
});

module.exports = router;
