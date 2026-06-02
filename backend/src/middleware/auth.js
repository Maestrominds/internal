const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

/**
 * Verifies JWT from HTTP-only cookie.
 * Also checks user is_active (for deleted managers).
 */
async function authenticate(req, res, next) {
  try {
    // Accept token from HTTP-only cookie (React web) OR Authorization header (Flutter)
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    // Check user still exists and is active
    const result = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      // Clear the cookie and force logout
      res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });
      return res.status(401).json({ message: 'Account has been deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
}

/**
 * Restricts access to boss role only.
 */
function requireBoss(req, res, next) {
  if (req.user?.role !== 'boss') {
    return res.status(403).json({ message: 'Access denied. Boss only.' });
  }
  next();
}

/**
 * Restricts access to manager role only.
 */
function requireManager(req, res, next) {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ message: 'Access denied. Manager only.' });
  }
  next();
}

module.exports = { authenticate, requireBoss, requireManager };
