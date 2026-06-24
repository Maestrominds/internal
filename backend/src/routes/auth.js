const express = require('express');
const router = express.Router();
const { login, logout, getMe, changePassword } = require('../controllers/authController');
const { authenticate, requireBoss } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, requireBoss, changePassword);

module.exports = router;
