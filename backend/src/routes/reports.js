const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  getReports,
  getClients,
  getReportById,
  createReport,
  updateReport,
} = require('../controllers/reportsController');

// Multer — memory storage, max 5 files, 3MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// GET /api/reports — Boss gets all, manager gets own + boss reports
router.get('/', authenticate, getReports);

// GET /api/reports/clients — get unique client grouping list
router.get('/clients', authenticate, getClients);

// GET /api/reports/:id
router.get('/:id', authenticate, getReportById);

// POST /api/reports — Boss & Manager
router.post(
  '/',
  authenticate,
  upload.array('images', 5),
  createReport
);

// PUT /api/reports/:id — Boss & Manager
router.put(
  '/:id',
  authenticate,
  upload.array('images', 5),
  updateReport
);

module.exports = router;
