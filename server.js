const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// Connect to MongoDB
connectDB();

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(generalLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Serve Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/elections', require('./routes/electionRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-Vote API is running',
    timestamp: new Date().toISOString(),
    features: [
      'Email Notifications (Nodemailer)',
      'Multi-Factor Authentication (OTP)',
      'Real-Time Dashboard (Socket.io)',
      'Public Vote Verification Portal',
      'Export Results (PDF/CSV)',
      'AI-Powered Election Analytics',
      'Hash Chain Integrity Verification'
    ]
  });
});

// ─── Serve index.html for root ──────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── 404 Handler for API routes ─────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Socket.io Real-Time Connection ─────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join_election', (electionId) => {
    socket.join(`election_${electionId}`);
    console.log(`📡 Socket ${socket.id} joined election room: ${electionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─── Seed Default Admin ─────────────────────────────────────────────
const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@evote.com',
        password: 'Admin@123',
        role: 'admin',
        isVerified: true
      });
      console.log('🔐 Default admin created: admin@evote.com / Admin@123');
    }
  } catch (error) {
    if (error.code !== 11000) {
      console.error('Admin seed error:', error.message);
    }
  }
};

// ─── Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`🚀 E-Vote Server running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io enabled for real-time updates`);
  console.log(`📧 Email service: ${process.env.SMTP_HOST ? 'Configured' : 'Ethereal (dev mode)'}`);
  console.log(`🔐 MFA/OTP: ${process.env.MFA_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  await seedAdmin();
});

module.exports = app;
