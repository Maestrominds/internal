const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/auditLogger');

// GET /api/managers (Boss only)
async function getManagers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, is_active, created_at
       FROM users
       WHERE role = 'manager'
       ORDER BY created_at DESC`
    );
    return res.status(200).json({ managers: result.rows });
  } catch (err) {
    console.error('getManagers error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/managers (Boss only)
async function addManager(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (name.length > 50) {
      return res.status(400).json({ message: 'Name must be 50 characters or less.' });
    }
    if (email.length > 50) {
      return res.status(400).json({ message: 'Email must be 50 characters or less.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Check duplicate
    const existing = await pool.query(
      'SELECT id, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_active) {
        return res.status(409).json({ message: 'Email already registered.' });
      }

      // If they exist but were soft-deleted (inactive), reactivate them!
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `UPDATE users
         SET name = $1, password = $2, is_active = true
         WHERE id = $3
         RETURNING id, name, email, is_active, created_at`,
        [name.trim(), hashedPassword, user.id]
      );

      return res.status(200).json({
        message: 'Manager reactivated successfully.',
        manager: result.rows[0],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, is_active)
       VALUES ($1, $2, $3, 'manager', true)
       RETURNING id, name, email, is_active, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    await logAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_MANAGER',
      entityType: 'manager',
      entityId: result.rows[0].id,
      description: `Added manager: ${name.trim()}`,
    });

    return res.status(201).json({
      message: 'Manager added successfully.',
      manager: result.rows[0],
    });
  } catch (err) {
    console.error('addManager error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/managers/:id (Boss only)
// Soft delete - sets is_active = false → triggers auto-logout on next request
async function deleteManager(req, res) {
  try {
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found.' });
    }
    if (check.rows[0].role !== 'manager') {
      return res.status(400).json({ message: 'Can only delete managers.' });
    }

    await pool.query(
      `UPDATE users SET is_active = false WHERE id = $1`,
      [id]
    );

    // Find manager name for log
    const managerName = check.rows[0].name || 'Unknown';
    await logAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DEACTIVATE_MANAGER',
      entityType: 'manager',
      entityId: id,
      description: `Deactivated manager: ${managerName}`,
    });

    return res.status(200).json({ message: 'Manager deleted successfully.' });
  } catch (err) {
    console.error('deleteManager error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/managers/:id/reset-password (Boss only)
// Updates manager password with user-provided password
async function resetManagerPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const check = await pool.query(
      `SELECT id, role, name FROM users WHERE id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found.' });
    }
    if (check.rows[0].role !== 'manager') {
      return res.status(400).json({ message: 'Can only reset manager passwords.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashedPassword, id]
    );

    await logAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RESET_PASSWORD',
      entityType: 'manager',
      entityId: id,
      description: `Reset password for manager: ${check.rows[0].name}`,
    });

    return res.status(200).json({
      message: 'Password reset successfully.',
      managerName: check.rows[0].name,
    });
  } catch (err) {
    console.error('resetManagerPassword error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getManagers, addManager, deleteManager, resetManagerPassword };
