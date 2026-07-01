const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAuditLogs, deleteAuditLog } = require('../controllers/auditController');

// GET /api/audit — Boss only
router.get('/', authenticate, getAuditLogs);

// DELETE /api/audit/:id - Boss only
router.delete('/:id', authenticate, deleteAuditLog);

module.exports = router;
