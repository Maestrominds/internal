const express = require('express');
const router = express.Router();
const { authenticate, requireBoss } = require('../middleware/auth');
const {
  getManagers,
  addManager,
  deleteManager,
  resetManagerPassword,
} = require('../controllers/managersController');

// All manager routes are Boss only
router.use(authenticate, requireBoss);

// GET /api/managers
router.get('/', getManagers);

// POST /api/managers
router.post('/', addManager);

// DELETE /api/managers/:id
router.delete('/:id', deleteManager);

// POST /api/managers/:id/reset-password
router.post('/:id/reset-password', resetManagerPassword);

module.exports = router;
