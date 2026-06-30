require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const managersRoutes = require('./routes/managers');
const auditRoutes = require('./routes/audit');
const errorHandler = require('./middleware/errorHandler');

const runMigration = require('./config/migrate');

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const app = express();

// Trust proxy for secure cookies in production (Vercel)
app.set('trust proxy', 1);


// CORS — allow React frontend + Flutter mobile (no strict origin for Flutter)
app.use(
  cors({
    origin: function (origin, callback) {
      // Normalize origin for comparison (remove trailing slashes)
      const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;

      // Allow requests with no origin (Flutter mobile, Postman, curl)
      if (!normalizedOrigin) {
        return callback(null, true);
      }

      const clientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
      const allowed = [
        clientUrl,
        'https://internal-client.vercel.app',
        'http://localhost:5173',
      ].filter(Boolean);

      if (allowed.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/managers', managersRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await runMigration();
    app.listen(PORT);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
