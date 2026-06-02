const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireManager } = require('../middleware/auth');
const {
  getReports,
  getReportById,
  createReport,
} = require('../controllers/reportsController');

// Multer — memory storage, max 5 files, 10MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// GET /api/reports — Boss gets all, manager gets own
router.get('/', authenticate, getReports);

// GET /api/reports/:id
router.get('/:id', authenticate, getReportById);

// POST /api/reports — Manager only
router.post(
  '/',
  authenticate,
  requireManager,
  upload.array('images', 5),
  createReport
);

module.exports = router;
