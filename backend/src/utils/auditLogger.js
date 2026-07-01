const pool = require('../config/db');

/**
 * Log an action to the audit_logs table.
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.userName
 * @param {string} params.userRole
 * @param {string} params.action  e.g. 'CREATE_REPORT', 'EDIT_REPORT', 'LOGIN', 'ADD_MANAGER', 'DEACTIVATE_MANAGER', 'RESET_PASSWORD'
 * @param {string} [params.entityType]  e.g. 'report', 'manager'
 * @param {string} [params.entityId]
 * @param {string} [params.description]
 */
async function logAction({ userId, userName, userRole, action, entityType, entityId, description }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, userName || 'Unknown', userRole || 'unknown', action, entityType || null, entityId || null, description || null]
    );
    // Keep only the latest 50 logs in the database
    await pool.query(
      `DELETE FROM audit_logs
       WHERE id NOT IN (
         SELECT id
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT 50
       )`
    );
  } catch (err) {
    // Never let audit logging crash the main request
    console.error('Audit log error:', err);
  }
}

module.exports = { logAction };
