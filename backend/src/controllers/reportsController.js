const pool = require('../config/db');
const { compressAndUpload, deleteFromCloudinary } = require('../utils/imageProcessor');
const { logAction } = require('../utils/auditLogger');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// GET /api/reports
// Boss & Manager: see all reports, with optional client_name/client_phone filters or search term
async function getReports(req, res) {
  try {
    const { client_name, client_phone, search } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    let query = `
      SELECT r.id, r.client_name, r.client_phone, r.client_business_name, r.amount, r.report_date, r.is_green, r.short_desc, r.note, r.next_report_date,
             u.name AS manager_name, u.role AS manager_role, u.id AS manager_id,
             (SELECT COUNT(*)::int FROM report_images WHERE report_id = r.id) AS image_count,
             COUNT(*) OVER()::int AS total_count
      FROM reports r
      JOIN users u ON r.manager_id = u.id
    `;
    const params = [];
    const conditions = [];

    // Client filtering
    if (client_phone && client_name) {
      conditions.push(`(r.client_phone = $${params.length + 1} OR (LOWER(r.client_name) = LOWER($${params.length + 2}) AND (r.client_phone IS NULL OR r.client_phone = '')))`);
      params.push(client_phone, client_name);
    } else if (client_phone) {
      conditions.push(`r.client_phone = $${params.length + 1}`);
      params.push(client_phone);
    } else if (client_name) {
      conditions.push(`LOWER(r.client_name) = LOWER($${params.length + 1}) AND (r.client_phone IS NULL OR r.client_phone = '')`);
      params.push(client_name);
    }

    // Search filter (searches client_name, client_phone, or manager name)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(r.client_name ILIKE $${params.length + 1} OR r.client_phone ILIKE $${params.length + 1} OR r.client_business_name ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.report_date DESC, r.created_at DESC';

    if (!isNaN(page) && !isNaN(limit) && page > 0 && limit > 0) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const result = await pool.query(query, params);
    const totalCount = result.rows.length > 0 ? result.rows[0].total_count : 0;
    const reports = result.rows.map(r => {
      const { total_count, ...reportData } = r;
      return {
        ...reportData,
        client_name: toTitleCase(r.client_name),
      };
    });
    return res.status(200).json({ reports, totalCount });
  } catch (err) {
    console.error('getReports error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/reports/clients
// Return unique clients list grouped by phone number (if exists) or client name
async function getClients(req, res) {
  try {
    let query, params;

    query = `
      SELECT r.client_name, r.client_phone, r.client_business_name
      FROM reports r
      JOIN users u ON r.manager_id = u.id
    `;
    params = [];

    const result = await pool.query(query, params);
    const rows = result.rows;

    const clientsMap = {};
    const nameOnlyClients = new Set();

    for (const row of rows) {
      const phone = row.client_phone ? row.client_phone.trim() : null;
      const name = row.client_name ? toTitleCase(row.client_name.trim()) : '';
      const businessName = row.client_business_name ? row.client_business_name.trim() : '';

      if (phone) {
        if (!clientsMap[phone] || (name && !clientsMap[phone].client_name)) {
          clientsMap[phone] = { client_name: name, client_phone: phone, client_business_name: businessName };
        }
      } else if (name) {
        nameOnlyClients.add(JSON.stringify({ client_name: name, client_business_name: businessName }));
      }
    }

    const clientsList = [];
    for (const phone in clientsMap) {
      clientsList.push(clientsMap[phone]);
    }
    const existingNames = new Set(
      Object.values(clientsMap).map(c => `${c.client_name.toLowerCase()}|${(c.client_business_name || '').toLowerCase()}`)
    );
    for (const nameJson of nameOnlyClients) {
      const parsed = JSON.parse(nameJson);
      const key = `${parsed.client_name.toLowerCase()}|${(parsed.client_business_name || '').toLowerCase()}`;
      if (!existingNames.has(key)) {
        clientsList.push({ client_name: parsed.client_name, client_phone: null, client_business_name: parsed.client_business_name });
      }
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
    const { client_name, client_phone, client_business_name, amount, note, short_desc, report_date, next_report_date } = req.body;
    const files = req.files || [];

    // All fields are optional except caption validation when images are uploaded
    if (client_name && client_name.length > 50) {
      return res.status(400).json({ message: 'Client name must be 50 characters or less.' });
    }
    if (client_phone && client_phone.length > 15) {
      return res.status(400).json({ message: 'Client phone must be 15 characters or less.' });
    }
    if (client_business_name && client_business_name.length > 100) {
      return res.status(400).json({ message: 'Client business name must be 100 characters or less.' });
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
    const finalIsGreen = req.body.is_green === 'false' || req.body.is_green === false ? false : true;
    const finalNextReportDate = next_report_date || null;

    const client = await pool.connect();
    const uploadedImages = [];
    try {
      await client.query('BEGIN');

      // Insert report
      const reportResult = await client.query(
        `INSERT INTO reports (manager_id, client_name, client_phone, client_business_name, amount, note, short_desc, report_date, is_green, next_report_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          req.user.id,
          finalClientName,
          finalClientPhone,
          client_business_name?.trim() || null,
          finalAmount,
          note?.trim() || null,
          short_desc?.trim() || null,
          finalReportDate,
          finalIsGreen,
          finalNextReportDate,
        ]
      );

      const report = reportResult.rows[0];

      // Upload images
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const caption = captions[i] ? captions[i].trim() : '';
        const { secure_url, public_id } = await compressAndUpload(
          file.buffer,
          file.originalname
        );

        const imgResult = await client.query(
          `INSERT INTO report_images (report_id, cloudinary_url, cloudinary_id, caption)
           VALUES ($1, $2, $3, $4) RETURNING id, cloudinary_url, cloudinary_id, caption`,
          [report.id, secure_url, public_id, caption]
        );

        uploadedImages.push(imgResult.rows[0]);
      }

      await client.query('COMMIT');

      // Audit log
      await logAction({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'CREATE_REPORT',
        entityType: 'report',
        entityId: report.id,
        description: `Created report for client: ${finalClientName}`,
      });

      return res.status(201).json({
        message: 'Report created successfully.',
        report: { ...report, images: uploadedImages },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      // Clean up uploaded images from Cloudinary on transaction failure
      for (const img of uploadedImages) {
        try {
          await deleteFromCloudinary(img.cloudinary_id);
        } catch (delErr) {
          console.error('Failed to clean up Cloudinary image:', img.cloudinary_id, delErr);
        }
      }
      console.error('createReport error:', err);
      return res.status(500).json({ message: err.message || 'Server error.' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('createReport error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/reports/:id (Boss & Manager)
async function updateReport(req, res) {
    const client = await pool.connect();
    const uploadedImages = [];
    const cloudinaryIdsToDelete = [];
    try {
      const { id } = req.params;
      const { client_name, client_phone, client_business_name, amount, note, short_desc, report_date, next_report_date } = req.body;
      const files = req.files || [];

      // Find original report and get submitter role
      const reportResult = await client.query(
        `SELECT r.*, u.role AS manager_role
       FROM reports r
       JOIN users u ON r.manager_id = u.id
       WHERE r.id = $1`,
        [id]
      );
      if (reportResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: 'Report not found.' });
      }
      const report = reportResult.rows[0];

      // Text Validations
      if (client_name && client_name.length > 50) {
        client.release();
        return res.status(400).json({ message: 'Client name must be 50 characters or less.' });
      }
      if (client_phone && client_phone.length > 15) {
        client.release();
        return res.status(400).json({ message: 'Client phone must be 15 characters or less.' });
      }
      if (client_business_name && client_business_name.length > 100) {
        client.release();
        return res.status(400).json({ message: 'Client business name must be 100 characters or less.' });
      }
      if (note && note.length > 20) {
        client.release();
        return res.status(400).json({ message: 'Note must be 20 characters or less.' });
      }
      if (short_desc && short_desc.length > 200) {
        client.release();
        return res.status(400).json({ message: 'Description must be 200 characters or less.' });
      }
      if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
        client.release();
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

      const existingImagesResult = await client.query(
        'SELECT id, cloudinary_id FROM report_images WHERE report_id = $1',
        [id]
      );
      const existingImages = existingImagesResult.rows;

      // Validate image limit (max 5)
      const newImageCount = files.length;
      const finalImageCount = existingImages.length - deleteIds.length + newImageCount;
      if (finalImageCount > 5) {
        client.release();
        return res.status(400).json({ message: 'Maximum 5 images allowed in a report.' });
      }

      // Captions validation for new files
      let captions = req.body.captions || [];
      if (newImageCount > 0) {
        if (!Array.isArray(captions)) {
          captions = [captions];
        }
        if (captions.length !== newImageCount) {
          client.release();
          return res.status(400).json({ message: 'Each new image must have a caption.' });
        }
        for (const cap of captions) {
          if (!cap || !cap.trim()) {
            client.release();
            return res.status(400).json({ message: 'Caption cannot be empty when adding images.' });
          }
          if (cap.length > 200) {
            client.release();
            return res.status(400).json({ message: 'Caption must be 200 characters or less.' });
          }
        }
      }

      await client.query('BEGIN');

      // Perform deletions in DB
      for (const imageId of deleteIds) {
        const match = existingImages.find(img => img.id === imageId);
        if (match) {
          cloudinaryIdsToDelete.push(match.cloudinary_id);
          await client.query('DELETE FROM report_images WHERE id = $1', [imageId]);
        }
      }

      // Perform additions of new files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const caption = captions[i] ? captions[i].trim() : '';
        const { secure_url, public_id } = await compressAndUpload(
          file.buffer,
          file.originalname
        );

        const imgResult = await client.query(
          `INSERT INTO report_images (report_id, cloudinary_url, cloudinary_id, caption)
         VALUES ($1, $2, $3, $4) RETURNING id, cloudinary_url, cloudinary_id, caption`,
          [id, secure_url, public_id, caption]
        );
        uploadedImages.push(imgResult.rows[0]);
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
      const finalIsGreen = req.body.is_green === 'false' || req.body.is_green === false ? false : true;
      const finalNextReportDate = next_report_date || null;

      // Update report
      await client.query(
        `UPDATE reports
        SET client_name = $1,
            client_phone = $2,
            client_business_name = $3,
            amount = $4,
            note = $5,
            short_desc = $6,
            report_date = $7,
            last_edited_by = $8,
            edited_by_ids = $9,
            is_green = $10,
            next_report_date = $11
        WHERE id = $12`,
        [
          finalClientName,
          finalClientPhone,
          client_business_name?.trim() || null,
          finalAmount,
          note?.trim() || null,
          short_desc?.trim() || null,
          finalReportDate,
          req.user.id,
          newEditedByIds,
          finalIsGreen,
          finalNextReportDate,
          id,
        ]
      );

      await client.query('COMMIT');

      // Only delete from Cloudinary after successful DB commit
      for (const cloudinaryId of cloudinaryIdsToDelete) {
        try {
          await deleteFromCloudinary(cloudinaryId);
        } catch (delErr) {
          console.error('Failed to delete image from Cloudinary:', cloudinaryId, delErr);
        }
      }

      // Audit log
      await logAction({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'EDIT_REPORT',
        entityType: 'report',
        entityId: id,
        description: `Edited report for client: ${toTitleCase(client_name?.trim() || report.client_name)}`,
      });

      return res.status(200).json({ message: 'Report updated successfully.' });
    } catch (err) {
      await client.query('ROLLBACK');
      // Clean up newly uploaded images from Cloudinary on failure
      for (const img of uploadedImages) {
        try {
          await deleteFromCloudinary(img.cloudinary_id);
        } catch (delErr) {
          console.error('Failed to clean up Cloudinary image during update rollback:', img.cloudinary_id, delErr);
        }
      }
      console.error('updateReport error:', err);
      return res.status(500).json({ message: err.message || 'Server error.' });
    } finally {
      client.release();
    }
  }

  module.exports = { getReports, getClients, getReportById, createReport, updateReport };
