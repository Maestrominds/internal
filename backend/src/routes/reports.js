const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireBoss } = require('../middleware/auth');
const {
  getReports,
  getClients,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  deleteClientReports,
} = require('../controllers/reportsController');
const { getClientExcel, getClientLedgerPdf } = require('../controllers/exportController');

// Multer — memory storage, max 5 files, 5MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
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

// GET /api/reports/export — download Excel for a client
router.get('/export', authenticate, getClientExcel);

// GET /api/reports/ledger-pdf — download PDF ledger for a client
router.get('/ledger-pdf', authenticate, getClientLedgerPdf);

// DELETE /api/reports/client — Boss deletes all reports of a client
router.delete('/client', authenticate, requireBoss, deleteClientReports);

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

// DELETE /api/reports/:id — Boss deletes a single report
router.delete('/:id', authenticate, requireBoss, deleteReport);

module.exports = router;
