const pool = require('../config/db');
const { compressAndUpload } = require('../utils/imageProcessor');

// GET /api/reports
// Boss: all reports with optional search by client_name or manager name
// Manager: own reports only
async function getReports(req, res) {
  try {
    const { search } = req.query;
    const user = req.user;

    let query, params;

    if (user.role === 'boss') {
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = `
          SELECT r.id, r.client_name, r.amount, r.report_date,
                 u.name AS manager_name, u.id AS manager_id
          FROM reports r
          JOIN users u ON r.manager_id = u.id
          WHERE (r.client_name ILIKE $1 OR u.name ILIKE $1)
          ORDER BY r.report_date DESC, r.created_at DESC
        `;
        params = [term];
      } else {
        query = `
          SELECT r.id, r.client_name, r.amount, r.report_date,
                 u.name AS manager_name, u.id AS manager_id
          FROM reports r
          JOIN users u ON r.manager_id = u.id
          ORDER BY r.report_date DESC, r.created_at DESC
        `;
        params = [];
      }
    } else {
      // Manager sees only their own reports
      query = `
        SELECT r.id, r.client_name, r.amount, r.report_date,
               u.name AS manager_name
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE r.manager_id = $1
        ORDER BY r.report_date DESC, r.created_at DESC
      `;
      params = [user.id];
    }

    const result = await pool.query(query, params);
    return res.status(200).json({ reports: result.rows });
  } catch (err) {
    console.error('getReports error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/reports/:id
async function getReportById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const result = await pool.query(
      `SELECT r.*, u.name AS manager_name, u.email AS manager_email
       FROM reports r
       JOIN users u ON r.manager_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    const report = result.rows[0];

    // Manager can only access own reports
    if (user.role === 'manager' && report.manager_id !== user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Fetch images
    const images = await pool.query(
      'SELECT id, cloudinary_url, cloudinary_id, caption FROM report_images WHERE report_id = $1 ORDER BY created_at ASC',
      [id]
    );

    return res.status(200).json({
      report: {
        ...report,
        images: images.rows,
      },
    });
  } catch (err) {
    console.error('getReportById error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/reports (Manager only)
async function createReport(req, res) {
  try {
    const { client_name, amount, note, short_desc, report_date } = req.body;
    const files = req.files || [];

    // Validations
    if (!client_name || !amount || !report_date) {
      return res.status(400).json({ message: 'Client name, amount, and date are required.' });
    }
    if (client_name.length > 50) {
      return res.status(400).json({ message: 'Client name must be 50 characters or less.' });
    }
    if (note && note.length > 20) {
      return res.status(400).json({ message: 'Note must be 20 characters or less.' });
    }
    if (short_desc && short_desc.length > 200) {
      return res.status(400).json({ message: 'Description must be 200 characters or less.' });
    }
    if (files.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed.' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Normalize and validate captions
    let captions = req.body.captions || [];
    if (files.length > 0) {
      if (!Array.isArray(captions)) {
        captions = [captions];
      }
      if (captions.length !== files.length) {
        return res.status(400).json({ message: 'Each image must have a caption.' });
      }
      for (const cap of captions) {
        if (!cap || !cap.trim()) {
          return res.status(400).json({ message: 'Caption cannot be empty.' });
        }
        if (cap.length > 200) {
          return res.status(400).json({ message: 'Caption must be 200 characters or less.' });
        }
      }
    }

    // Insert report
    const reportResult = await pool.query(
      `INSERT INTO reports (manager_id, client_name, amount, note, short_desc, report_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        client_name.trim(),
        parseFloat(amount),
        note?.trim() || null,
        short_desc?.trim() || null,
        report_date,
      ]
    );

    const report = reportResult.rows[0];

    // Upload images
    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const caption = captions[i] ? captions[i].trim() : '';
      try {
        const { secure_url, public_id } = await compressAndUpload(
          file.buffer,
          file.originalname
        );

        const imgResult = await pool.query(
          `INSERT INTO report_images (report_id, cloudinary_url, cloudinary_id, caption)
           VALUES ($1, $2, $3, $4) RETURNING id, cloudinary_url, cloudinary_id, caption`,
          [report.id, secure_url, public_id, caption]
        );

        uploadedImages.push(imgResult.rows[0]);
      } catch (imgErr) {
        console.error('Image upload error:', imgErr);
      }
    }

    return res.status(201).json({
      message: 'Report created successfully.',
      report: { ...report, images: uploadedImages },
    });
  } catch (err) {
    console.error('createReport error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getReports, getReportById, createReport };
