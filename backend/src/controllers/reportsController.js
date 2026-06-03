const pool = require('../config/db');
const { compressAndUpload, deleteFromCloudinary } = require('../utils/imageProcessor');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// GET /api/reports
// Boss: sees all reports, with optional client_name/client_phone filters or search term
// Manager: sees own reports + boss-created reports
async function getReports(req, res) {
  try {
    const { client_name, client_phone, search } = req.query;
    const user = req.user;

    let query = `
      SELECT r.id, r.client_name, r.client_phone, r.amount, r.report_date,
             u.name AS manager_name, u.role AS manager_role, u.id AS manager_id
      FROM reports r
      JOIN users u ON r.manager_id = u.id
    `;
    const params = [];
    const conditions = [];

    // Authorization filter
    if (user.role !== 'boss') {
      conditions.push(`(r.manager_id = $${params.length + 1} OR u.role = 'boss')`);
      params.push(user.id);
    }

    // Client filtering
    if (client_phone) {
      conditions.push(`r.client_phone = $${params.length + 1}`);
      params.push(client_phone);
    } else if (client_name) {
      conditions.push(`LOWER(r.client_name) = LOWER($${params.length + 1}) AND (r.client_phone IS NULL OR r.client_phone = '')`);
      params.push(client_name);
    }

    // Search filter (searches client_name, client_phone, or manager name)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(r.client_name ILIKE $${params.length + 1} OR r.client_phone ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.report_date DESC, r.created_at DESC';

    const result = await pool.query(query, params);
    const reports = result.rows.map(r => ({
      ...r,
      client_name: toTitleCase(r.client_name),
    }));
    return res.status(200).json({ reports });
  } catch (err) {
    console.error('getReports error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/reports/clients
// Return unique clients list grouped by phone number (if exists) or client name
async function getClients(req, res) {
  try {
    const user = req.user;
    let query, params;

    if (user.role === 'boss') {
      query = `
        SELECT r.client_name, r.client_phone
        FROM reports r
        JOIN users u ON r.manager_id = u.id
      `;
      params = [];
    } else {
      query = `
        SELECT r.client_name, r.client_phone
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE r.manager_id = $1 OR u.role = 'boss'
      `;
      params = [user.id];
    }

    const result = await pool.query(query, params);
    const rows = result.rows;

    const clientsMap = {};
    const nameOnlyClients = new Set();

    for (const row of rows) {
      const phone = row.client_phone ? row.client_phone.trim() : null;
      const name = row.client_name ? toTitleCase(row.client_name.trim()) : '';

      if (phone) {
        if (!clientsMap[phone] || (name && !clientsMap[phone].client_name)) {
          clientsMap[phone] = { client_name: name, client_phone: phone };
        }
      } else if (name) {
        nameOnlyClients.add(name);
      }
    }

    const clientsList = [];
    for (const phone in clientsMap) {
      clientsList.push(clientsMap[phone]);
    }
    for (const name of nameOnlyClients) {
      clientsList.push({ client_name: name, client_phone: null });
    }

    clientsList.sort((a, b) =>
      a.client_name.localeCompare(b.client_name, undefined, { sensitivity: 'base' })
    );

    return res.status(200).json({ clients: clientsList });
  } catch (err) {
    console.error('getClients error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/reports/:id
async function getReportById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const result = await pool.query(
      `SELECT r.*,
              u.name AS manager_name, u.email AS manager_email, u.role AS manager_role,
              e.name AS last_edited_by_name
       FROM reports r
       JOIN users u ON r.manager_id = u.id
       LEFT JOIN users e ON r.last_edited_by = e.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    const report = result.rows[0];

    // Manager can access own reports OR boss-created reports
    if (user.role === 'manager' && report.manager_id !== user.id && report.manager_role !== 'boss') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Fetch images
    const images = await pool.query(
      'SELECT id, cloudinary_url, cloudinary_id, caption FROM report_images WHERE report_id = $1 ORDER BY created_at ASC',
      [id]
    );

    // Fetch edit trail details
    let editors = [];
    if (report.edited_by_ids && report.edited_by_ids.length > 0) {
      const editorsResult = await pool.query(
        'SELECT id, name, role FROM users WHERE id = ANY($1)',
        [report.edited_by_ids]
      );
      // Preserve order from edited_by_ids array
      editors = report.edited_by_ids.map(uid =>
        editorsResult.rows.find(row => row.id === uid)
      ).filter(Boolean);
    }

    return res.status(200).json({
      report: {
        ...report,
        client_name: toTitleCase(report.client_name),
        images: images.rows,
        editors,
      },
    });
  } catch (err) {
    console.error('getReportById error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/reports (Boss & Manager)
async function createReport(req, res) {
  try {
    const { client_name, client_phone, amount, note, short_desc, report_date } = req.body;
    const files = req.files || [];

    // All fields are optional except caption validation when images are uploaded
    if (client_name && client_name.length > 50) {
      return res.status(400).json({ message: 'Client name must be 50 characters or less.' });
    }
    if (client_phone && client_phone.length > 15) {
      return res.status(400).json({ message: 'Client phone must be 15 characters or less.' });
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
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Image caption validation (required if image present)
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
          return res.status(400).json({ message: 'Caption cannot be empty when adding images.' });
        }
        if (cap.length > 200) {
          return res.status(400).json({ message: 'Caption must be 200 characters or less.' });
        }
      }
    }

    // Defaulting fields
    const finalClientName = toTitleCase(client_name?.trim() || 'Unnamed Client');
    const finalClientPhone = client_phone?.trim() || null;
    const finalAmount = amount ? parseFloat(amount) : 0;
    const finalReportDate = report_date || new Date().toISOString().split('T')[0];

    // Insert report
    const reportResult = await pool.query(
      `INSERT INTO reports (manager_id, client_name, client_phone, amount, note, short_desc, report_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        finalClientName,
        finalClientPhone,
        finalAmount,
        note?.trim() || null,
        short_desc?.trim() || null,
        finalReportDate,
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

// PUT /api/reports/:id (Boss & Manager)
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { client_name, client_phone, amount, note, short_desc, report_date } = req.body;
    const files = req.files || [];

    // Find original report
    const reportResult = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (reportResult.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    const report = reportResult.rows[0];

    // Authorization: Boss can edit all. Manager edits only own.
    if (req.user.role === 'manager' && report.manager_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only edit your own reports.' });
    }

    // Text Validations
    if (client_name && client_name.length > 50) {
      return res.status(400).json({ message: 'Client name must be 50 characters or less.' });
    }
    if (client_phone && client_phone.length > 15) {
      return res.status(400).json({ message: 'Client phone must be 15 characters or less.' });
    }
    if (note && note.length > 20) {
      return res.status(400).json({ message: 'Note must be 20 characters or less.' });
    }
    if (short_desc && short_desc.length > 200) {
      return res.status(400).json({ message: 'Description must be 200 characters or less.' });
    }
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Image Deletion processing
    let deleteIds = [];
    if (req.body.deleted_image_ids) {
      try {
        deleteIds = typeof req.body.deleted_image_ids === 'string'
          ? JSON.parse(req.body.deleted_image_ids)
          : req.body.deleted_image_ids;
      } catch (e) {
        deleteIds = req.body.deleted_image_ids.split(',').map(x => x.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(deleteIds)) {
      deleteIds = [deleteIds];
    }

    const existingImagesResult = await pool.query(
      'SELECT id, cloudinary_id FROM report_images WHERE report_id = $1',
      [id]
    );
    const existingImages = existingImagesResult.rows;

    // Validate image limit (max 5)
    const newImageCount = files.length;
    const finalImageCount = existingImages.length - deleteIds.length + newImageCount;
    if (finalImageCount > 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed in a report.' });
    }

    // Captions validation for new files
    let captions = req.body.captions || [];
    if (newImageCount > 0) {
      if (!Array.isArray(captions)) {
        captions = [captions];
      }
      if (captions.length !== newImageCount) {
        return res.status(400).json({ message: 'Each new image must have a caption.' });
      }
      for (const cap of captions) {
        if (!cap || !cap.trim()) {
          return res.status(400).json({ message: 'Caption cannot be empty when adding images.' });
        }
        if (cap.length > 200) {
          return res.status(400).json({ message: 'Caption must be 200 characters or less.' });
        }
      }
    }

    // Perform deletions
    for (const imageId of deleteIds) {
      const match = existingImages.find(img => img.id === imageId);
      if (match) {
        try {
          await deleteFromCloudinary(match.cloudinary_id);
        } catch (err) {
          console.error('Failed to delete image from Cloudinary:', match.cloudinary_id, err);
        }
        await pool.query('DELETE FROM report_images WHERE id = $1', [imageId]);
      }
    }

    // Perform additions of new files
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
          [id, secure_url, public_id, caption]
        );
        uploadedImages.push(imgResult.rows[0]);
      } catch (imgErr) {
        console.error('Image upload error during update:', imgErr);
      }
    }

    // Update edit trail history
    let newEditedByIds = report.edited_by_ids || [];
    if (report.manager_id !== req.user.id && !newEditedByIds.includes(req.user.id)) {
      newEditedByIds = [...newEditedByIds, req.user.id];
    }

    // Defaults for text fields
    const finalClientName = toTitleCase(client_name?.trim() || 'Unnamed Client');
    const finalClientPhone = client_phone?.trim() || null;
    const finalAmount = amount ? parseFloat(amount) : 0;
    const finalReportDate = report_date || new Date().toISOString().split('T')[0];

    // Update report
    await pool.query(
      `UPDATE reports
       SET client_name = $1,
           client_phone = $2,
           amount = $3,
           note = $4,
           short_desc = $5,
           report_date = $6,
           last_edited_by = $7,
           edited_by_ids = $8
       WHERE id = $9`,
      [
        finalClientName,
        finalClientPhone,
        finalAmount,
        note?.trim() || null,
        short_desc?.trim() || null,
        finalReportDate,
        req.user.id,
        newEditedByIds,
        id,
      ]
    );

    return res.status(200).json({ message: 'Report updated successfully.' });
  } catch (err) {
    console.error('updateReport error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getReports, getClients, getReportById, createReport, updateReport };
