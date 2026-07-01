const pool = require('../config/db');

// GET /api/audit — Boss only, paginated, newest first
async function getAuditLogs(req, res) {
  try {
    if (req.user.role !== 'boss') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const action = req.query.action || null;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push(`action = $${params.length + 1}`);
      params.push(action);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${where}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT id, user_id, user_name, user_role, action, entity_type, entity_id, description, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return res.status(200).json({
      logs: dataResult.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function deleteAuditLog(req, res) {
  try {
    if (req.user.role !== 'boss') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const { id } = req.params;
    await pool.query('DELETE FROM audit_logs WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Audit log deleted successfully.' });
  } catch (err) {
    console.error('deleteAuditLog error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getAuditLogs, deleteAuditLog };
