const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditController');

// GET /api/audit — Boss only
router.get('/', authenticate, getAuditLogs);

module.exports = router;
