const pool = require('../config/db');
const ExcelJS = require('xlsx');
const PDFDocument = require('pdfkit');

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatINRPlain(amount) {
  // Returns a plain number string formatted like Indian numbering: e.g. 1,00,000.00
  const num = Math.abs(parseFloat(amount) || 0);
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatted;
}

function formatDateStr(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// GET /api/reports/export?client_name=...&client_phone=...
async function getClientExcel(req, res) {
  try {
    const { client_name, client_phone } = req.query;
    if (!client_name) {
      return res.status(400).json({ message: 'client_name is required.' });
    }

    let query, params;
    if (client_phone && client_phone.trim()) {
      query = `
        SELECT r.id, r.client_name, r.client_phone, r.client_business_name,
               r.amount, r.report_date, r.is_green,
               u.name AS manager_name
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE r.client_phone = $1
        ORDER BY r.report_date ASC, r.created_at ASC
      `;
      params = [client_phone.trim()];
    } else {
      query = `
        SELECT r.id, r.client_name, r.client_phone, r.client_business_name,
               r.amount, r.report_date, r.is_green,
               u.name AS manager_name
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE LOWER(r.client_name) = LOWER($1) AND (r.client_phone IS NULL OR r.client_phone = '')
        ORDER BY r.report_date ASC, r.created_at ASC
      `;
      params = [client_name.trim()];
    }

    const result = await pool.query(query, params);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No reports found for this client.' });
    }

    const clientNameDisplay = toTitleCase(rows[0].client_name);
    const businessName = rows[0].client_business_name || '';
    const clientLabel = businessName ? `${clientNameDisplay} / ${businessName}` : clientNameDisplay;

    // First report's amount as "received amt"
    const firstRow = rows[0];
    const receivedAmt = parseFloat(firstRow.amount) || 0;

    // Compute cumulative outstanding per row
    let runningSum = 0;
    const excelData = rows.map((r, idx) => {
      const amt = parseFloat(r.amount) || 0;
      runningSum = r.is_green ? runningSum + amt : runningSum - amt;

      return {
        'S.No': idx + 1,
        'Client Name / Business Name': clientLabel,
        'Date': formatDateStr(r.report_date),
        'Received Amt': formatINRPlain(receivedAmt),
        'Report Amount': formatINRPlain(amt),
        'Pending Amount': formatINRPlain(Math.abs(runningSum)),
      };
    });

    const wb = ExcelJS.utils.book_new();
    const ws = ExcelJS.utils.json_to_sheet(excelData);

    // Column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 35 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    ExcelJS.utils.book_append_sheet(wb, ws, 'Ledger');

    const buffer = ExcelJS.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeFileName = clientNameDisplay.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_ledger.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('getClientExcel error:', err);
    return res.status(500).json({ message: 'Failed to generate Excel.' });
  }
}

// GET /api/reports/ledger-pdf?client_name=...&client_phone=...
async function getClientLedgerPdf(req, res) {
  try {
    const { client_name, client_phone } = req.query;
    if (!client_name) {
      return res.status(400).json({ message: 'client_name is required.' });
    }

    let query, params;
    if (client_phone && client_phone.trim()) {
      query = `
        SELECT r.id, r.client_name, r.client_phone, r.client_business_name,
               r.amount, r.report_date, r.is_green,
               u.name AS manager_name
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE r.client_phone = $1
        ORDER BY r.report_date ASC, r.created_at ASC
      `;
      params = [client_phone.trim()];
    } else {
      query = `
        SELECT r.id, r.client_name, r.client_phone, r.client_business_name,
               r.amount, r.report_date, r.is_green,
               u.name AS manager_name
        FROM reports r
        JOIN users u ON r.manager_id = u.id
        WHERE LOWER(r.client_name) = LOWER($1) AND (r.client_phone IS NULL OR r.client_phone = '')
        ORDER BY r.report_date ASC, r.created_at ASC
      `;
      params = [client_name.trim()];
    }

    const result = await pool.query(query, params);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No reports found for this client.' });
    }

    const clientNameDisplay = toTitleCase(rows[0].client_name);
    const businessName = rows[0].client_business_name || '';
    const phone = rows[0].client_phone || '';

    // Net outstanding
    const netOutstanding = rows.reduce((sum, r) => {
      const amt = parseFloat(r.amount) || 0;
      return r.is_green ? sum + amt : sum - amt;
    }, 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const safeFileName = clientNameDisplay.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_ledger.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // ── Header ──
    doc.fontSize(18).font('Helvetica-Bold').text('Client Ledger', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).font('Helvetica-Bold').text(clientNameDisplay, { align: 'center' });
    if (businessName) {
      doc.fontSize(11).font('Helvetica').fillColor('#555555').text(businessName, { align: 'center' });
    }
    if (phone) {
      doc.fontSize(10).fillColor('#666666').text(`Phone: ${phone}`, { align: 'center' });
    }
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333333')
      .text(`Generated: ${formatDateStr(new Date().toISOString())}   |   Net Outstanding: ${netOutstanding >= 0 ? '+' : '-'} Rs. ${formatINRPlain(Math.abs(netOutstanding))}`, { align: 'center' });
    doc.moveDown(0.8);

    // ── Table Header ──
    const tableTop = doc.y;
    const colWidths = [35, 95, 120, 100, 100, 105];
    const colX = [40];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }
    const headers = ['S.No', 'Date', 'Uploaded By', 'Amount', 'Net Outstanding', 'Client'];
    const rowH = 20;

    // Header row background
    doc.rect(40, tableTop, 515, rowH).fill('#1E4D8C');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 4, tableTop + 6, { width: colWidths[i] - 6, lineBreak: false });
    });

    // ── Rows ──
    let runningSum = 0;
    let y = tableTop + rowH;

    rows.forEach((r, idx) => {
      const amt = parseFloat(r.amount) || 0;
      runningSum = r.is_green ? runningSum + amt : runningSum - amt;

      const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F0F4F8';
      doc.rect(40, y, 515, rowH).fill(bgColor);

      const amtColor = r.is_green ? '#059669' : '#DC2626';
      const outColor = runningSum >= 0 ? '#059669' : '#DC2626';
      const amtText = `${r.is_green ? '+' : '-'} Rs.${formatINRPlain(amt)}`;
      const outText = `${runningSum >= 0 ? '+' : '-'} Rs.${formatINRPlain(Math.abs(runningSum))}`;

      const cells = [
        { text: String(idx + 1), color: '#374151' },
        { text: formatDateStr(r.report_date), color: '#374151' },
        { text: r.manager_name || '—', color: '#374151' },
        { text: amtText, color: amtColor },
        { text: outText, color: outColor },
        { text: `${clientNameDisplay}${businessName ? ' / ' + businessName : ''}`, color: '#374151' },
      ];

      doc.font('Helvetica').fontSize(7.5);
      cells.forEach((cell, i) => {
        doc.fillColor(cell.color).text(cell.text, colX[i] + 4, y + 6, { width: colWidths[i] - 6, lineBreak: false });
      });

      y += rowH;

      // Page break
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
    });

    // Bottom border
    doc.rect(40, y, 515, 1).fill('#CBD5E1');

    doc.end();
  } catch (err) {
    console.error('getClientLedgerPdf error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to generate PDF.' });
    }
  }
}

module.exports = { getClientExcel, getClientLedgerPdf };
