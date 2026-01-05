/**
 * Invoice Routes - Finance Module (Module 1.4)
 * Includes Nigeria VAT/WHT tax compliance
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Nigeria tax rates
const NIGERIA_VAT_RATE = 0.075; // 7.5%
const NIGERIA_WHT_RATE_SERVICES = 0.05; // 5%
const NIGERIA_WHT_RATE_PROFESSIONAL = 0.10; // 10%

// Generate invoice number
async function generateInvoiceNumber(tenantId, pool) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM invoices WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  const num = result.rows[0].next_num.toString().padStart(5, '0');
  return `INV-${year}-${num}`;
}

// GET /api/invoices - List all invoices
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client_id, from_date, to_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE i.tenant_id = $1 AND i.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND i.invoice_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND i.invoice_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoices i ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT i.*, c.company_name as client_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       ${whereClause}
       ORDER BY i.invoice_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/aging - Get aging report (MUST BE BEFORE :id route)
router.get('/aging', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as current,
        SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_1_30,
        SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_31_60,
        SUM(CASE WHEN due_date < CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_over_60
       FROM invoices
       WHERE tenant_id = $1 AND status IN ('sent', 'overdue', 'partial') AND deleted_at IS NULL`,
      [req.tenant_id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Aging report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch aging report' });
  }
});

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoiceResult = await pool.query(
      `SELECT i.*, c.company_name as client_name, c.email as client_email,
              c.phone as client_phone, c.address_line1, c.city, c.state
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Get invoice items
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows
    };

    res.json({ success: true, data: invoice });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', async (req, res) => {
  try {
    const {
      client_id, engagement_id, invoice_date, due_date, items,
      apply_vat, apply_wht, wht_type, notes, terms
    } = req.body;

    if (!client_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Client and at least one item are required'
      });
    }

    const id = uuidv4();
    const invoice_number = await generateInvoiceNumber(req.tenant_id, pool);

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.quantity * item.unit_price;
    });

    const vat_amount = apply_vat ? subtotal * NIGERIA_VAT_RATE : 0;
    const wht_rate = wht_type === 'professional' ? NIGERIA_WHT_RATE_PROFESSIONAL : NIGERIA_WHT_RATE_SERVICES;
    const wht_amount = apply_wht ? subtotal * wht_rate : 0;
    const total_amount = subtotal + vat_amount - wht_amount;

    // Create invoice
    const invoiceResult = await pool.query(
      `INSERT INTO invoices (
        id, tenant_id, invoice_number, client_id, engagement_id,
        invoice_date, due_date, subtotal, vat_rate, vat_amount,
        wht_rate, wht_amount, total_amount, notes, terms, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft', $16)
      RETURNING *`,
      [
        id, req.tenant_id, invoice_number, client_id, engagement_id,
        invoice_date || new Date(), due_date, subtotal,
        apply_vat ? NIGERIA_VAT_RATE * 100 : 0, vat_amount,
        apply_wht ? wht_rate * 100 : 0, wht_amount, total_amount,
        notes, terms, req.user.id
      ]
    );

    // Create invoice items
    for (const item of items) {
      await pool.query(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    // Get complete invoice with items
    const result = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1',
      [id]
    );

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', async (req, res) => {
  try {
    const {
      client_id, engagement_id, invoice_date, due_date, items,
      apply_vat, apply_wht, wht_type, notes, terms, status,
      subtotal: providedSubtotal, vat_amount: providedVat,
      wht_amount: providedWht, total_amount: providedTotal
    } = req.body;

    // Check invoice exists
    const existing = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    let subtotal, vat_amount, wht_amount, total_amount;

    // If items provided, recalculate totals from items
    if (items && items.length > 0) {
      subtotal = 0;
      items.forEach(item => {
        subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      });

      const applyVat = apply_vat !== undefined ? apply_vat : existing.rows[0].vat_rate > 0;
      const applyWht = apply_wht !== undefined ? apply_wht : existing.rows[0].wht_rate > 0;
      const whtRate = wht_type === 'professional' ? NIGERIA_WHT_RATE_PROFESSIONAL : NIGERIA_WHT_RATE_SERVICES;

      vat_amount = applyVat ? subtotal * NIGERIA_VAT_RATE : 0;
      wht_amount = applyWht ? subtotal * whtRate : 0;
      total_amount = subtotal + vat_amount - wht_amount;

      // Delete existing items and insert new ones
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);

      for (const item of items) {
        await pool.query(
          `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(),
            req.params.id,
            item.description,
            parseFloat(item.quantity) || 0,
            parseFloat(item.unit_price) || 0,
            (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
          ]
        );
      }
    } else {
      // Use provided totals (legacy mode without line items)
      subtotal = parseFloat(providedSubtotal) || existing.rows[0].subtotal;
      vat_amount = parseFloat(providedVat) || existing.rows[0].vat_amount;
      wht_amount = parseFloat(providedWht) || existing.rows[0].wht_amount;
      total_amount = parseFloat(providedTotal) || existing.rows[0].total_amount;
    }

    // Update invoice
    const result = await pool.query(
      `UPDATE invoices SET
        client_id = COALESCE($1, client_id),
        engagement_id = COALESCE($2, engagement_id),
        invoice_date = COALESCE($3, invoice_date),
        due_date = COALESCE($4, due_date),
        subtotal = $5,
        vat_amount = $6,
        wht_amount = $7,
        total_amount = $8,
        notes = COALESCE($9, notes),
        terms = COALESCE($10, terms),
        status = COALESCE($11, status),
        updated_at = NOW()
       WHERE id = $12 AND tenant_id = $13 AND deleted_at IS NULL
       RETURNING *`,
      [
        client_id, engagement_id, invoice_date, due_date,
        subtotal, vat_amount, wht_amount, total_amount,
        notes, terms, status, req.params.id, req.tenant_id
      ]
    );

    // Get items
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        items: itemsResult.rows
      }
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// PUT /api/invoices/:id/send - Send invoice
router.put('/:id/send', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE invoices
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invoice' });
  }
});

// DELETE /api/invoices/:id - Soft delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE invoices SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete invoice' });
  }
});

// GET /api/invoices/:id/pdf - Generate PDF invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    // Get invoice with client info
    const invoiceResult = await pool.query(
      `SELECT i.*, c.company_name as client_name, c.email as client_email,
              c.phone as client_phone, c.address_line1, c.city, c.state,
              t.name as tenant_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN tenants t ON i.tenant_id = t.id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get invoice items
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    const items = itemsResult.rows;

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

    doc.pipe(res);

    // Brand colors
    const navyBlue = '#0d2865';
    const teal = '#41d8d1';

    // Header with brand color
    doc.rect(0, 0, doc.page.width, 80).fill(navyBlue);

    // Company name
    doc.fillColor('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(invoice.tenant_name || 'CoreHR', 50, 25);

    doc.fontSize(10)
       .font('Helvetica')
       .text('Professional Consulting Services', 50, 52);

    // Invoice title
    doc.fillColor(navyBlue)
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('INVOICE', 50, 110);

    // Invoice details (right side)
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#333');

    const rightCol = 400;
    doc.text('Invoice Number:', rightCol, 110);
    doc.font('Helvetica-Bold').text(invoice.invoice_number, rightCol + 90, 110);

    doc.font('Helvetica').text('Invoice Date:', rightCol, 125);
    doc.font('Helvetica-Bold').text(
      new Date(invoice.invoice_date).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
      rightCol + 90, 125
    );

    if (invoice.due_date) {
      doc.font('Helvetica').text('Due Date:', rightCol, 140);
      doc.font('Helvetica-Bold').text(
        new Date(invoice.due_date).toLocaleDateString('en-NG', {
          year: 'numeric', month: 'long', day: 'numeric'
        }),
        rightCol + 90, 140
      );
    }

    // Status badge
    const statusColors = {
      draft: '#6b7280',
      sent: '#3b82f6',
      paid: '#22c55e',
      partial: '#f59e0b',
      overdue: '#ef4444'
    };
    const statusColor = statusColors[invoice.status] || '#6b7280';
    doc.rect(rightCol, 160, 80, 20).fill(statusColor);
    doc.fillColor('white')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(invoice.status.toUpperCase(), rightCol + 5, 165, { width: 70, align: 'center' });

    // Bill To section
    doc.fillColor(navyBlue)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('BILL TO', 50, 170);

    doc.fillColor('#333')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(invoice.client_name || 'N/A', 50, 190);

    doc.font('Helvetica')
       .fontSize(10);

    let yPos = 205;
    if (invoice.address_line1) {
      doc.text(invoice.address_line1, 50, yPos);
      yPos += 15;
    }
    if (invoice.city || invoice.state) {
      doc.text(`${invoice.city || ''}${invoice.city && invoice.state ? ', ' : ''}${invoice.state || ''}`, 50, yPos);
      yPos += 15;
    }
    if (invoice.client_email) {
      doc.text(invoice.client_email, 50, yPos);
      yPos += 15;
    }
    if (invoice.client_phone) {
      doc.text(invoice.client_phone, 50, yPos);
    }

    // Items table
    const tableTop = 280;
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount'];
    const colWidths = [250, 50, 100, 100];
    const colX = [50, 300, 350, 450];

    // Table header with teal accent
    doc.rect(50, tableTop, 500, 25).fill(teal);
    doc.fillColor('white')
       .fontSize(10)
       .font('Helvetica-Bold');

    tableHeaders.forEach((header, i) => {
      const align = i === 0 ? 'left' : 'right';
      const x = i === 0 ? colX[i] + 5 : colX[i];
      const w = i === 0 ? colWidths[i] - 5 : colWidths[i];
      doc.text(header, x, tableTop + 8, { width: w, align });
    });

    // Table rows
    let rowY = tableTop + 30;
    doc.fillColor('#333').font('Helvetica');

    // Format currency helper
    const formatNGN = (amount) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    if (items.length > 0) {
      items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(50, rowY - 5, 500, 25).fill(rowBg);
        doc.fillColor('#333');

        doc.text(item.description || '', colX[0] + 5, rowY, { width: colWidths[0] - 5 });
        doc.text(item.quantity?.toString() || '1', colX[1], rowY, { width: colWidths[1], align: 'right' });
        doc.text(formatNGN(item.unit_price), colX[2], rowY, { width: colWidths[2], align: 'right' });
        doc.text(formatNGN(item.amount || (item.quantity * item.unit_price)), colX[3], rowY, { width: colWidths[3], align: 'right' });

        rowY += 25;
      });
    } else {
      // If no items, show subtotal as single line
      doc.rect(50, rowY - 5, 500, 25).fill('#f9fafb');
      doc.fillColor('#333');
      doc.text('Services', colX[0] + 5, rowY, { width: colWidths[0] - 5 });
      doc.text('1', colX[1], rowY, { width: colWidths[1], align: 'right' });
      doc.text(formatNGN(invoice.subtotal), colX[2], rowY, { width: colWidths[2], align: 'right' });
      doc.text(formatNGN(invoice.subtotal), colX[3], rowY, { width: colWidths[3], align: 'right' });
      rowY += 25;
    }

    // Totals section
    rowY += 10;
    const totalsX = 350;
    const totalsValX = 450;
    const totalsWidth = 100;

    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', totalsX, rowY, { width: totalsWidth, align: 'right' });
    doc.text(formatNGN(invoice.subtotal), totalsValX, rowY, { width: totalsWidth, align: 'right' });
    rowY += 18;

    if (invoice.vat_amount && parseFloat(invoice.vat_amount) > 0) {
      doc.text(`VAT (${invoice.vat_rate || 7.5}%):`, totalsX, rowY, { width: totalsWidth, align: 'right' });
      doc.text(formatNGN(invoice.vat_amount), totalsValX, rowY, { width: totalsWidth, align: 'right' });
      rowY += 18;
    }

    if (invoice.wht_amount && parseFloat(invoice.wht_amount) > 0) {
      doc.text(`WHT (${invoice.wht_rate || 5}%):`, totalsX, rowY, { width: totalsWidth, align: 'right' });
      doc.fillColor('#dc2626');
      doc.text(`-${formatNGN(invoice.wht_amount)}`, totalsValX, rowY, { width: totalsWidth, align: 'right' });
      doc.fillColor('#333');
      rowY += 18;
    }

    // Total line
    doc.rect(totalsX, rowY, 200, 1).fill(navyBlue);
    rowY += 8;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(navyBlue);
    doc.text('TOTAL:', totalsX, rowY, { width: totalsWidth, align: 'right' });
    doc.text(formatNGN(invoice.total_amount), totalsValX, rowY, { width: totalsWidth, align: 'right' });

    // Notes section
    if (invoice.notes) {
      rowY += 50;
      doc.fillColor(navyBlue)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Notes:', 50, rowY);

      doc.fillColor('#666')
         .fontSize(10)
         .font('Helvetica')
         .text(invoice.notes, 50, rowY + 18, { width: 500 });
    }

    // Footer
    const footerY = doc.page.height - 80;
    doc.rect(0, footerY, doc.page.width, 80).fill('#f3f4f6');

    doc.fillColor('#666')
       .fontSize(9)
       .font('Helvetica')
       .text('Thank you for your business!', 50, footerY + 15, { align: 'center', width: doc.page.width - 100 });

    doc.fontSize(8)
       .text('Payment is due within the terms stated above. Please include invoice number with payment.',
             50, footerY + 35, { align: 'center', width: doc.page.width - 100 });

    doc.fillColor(teal)
       .text('Powered by CoreHR', 50, footerY + 55, { align: 'center', width: doc.page.width - 100 });

    doc.end();

  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

// POST /api/invoices/:id/send-email - Send invoice via email
router.post('/:id/send-email', async (req, res) => {
  try {
    // Get invoice with client info
    const invoiceResult = await pool.query(
      `SELECT i.*, c.company_name as client_name, c.email as client_email,
              c.contact_person as client_contact,
              t.name as tenant_name
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN tenants t ON i.tenant_id = t.id
       WHERE i.id = $1 AND i.tenant_id = $2 AND i.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (!invoice.client_email) {
      return res.status(400).json({
        success: false,
        error: 'Client email address not found'
      });
    }

    // Get invoice items for email summary
    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    const items = itemsResult.rows;

    // Format currency
    const formatNGN = (amount) => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    // Build items HTML
    let itemsHtml = '';
    if (items.length > 0) {
      items.forEach(item => {
        itemsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description || 'Service'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity || 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatNGN(item.unit_price)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatNGN(item.amount)}</td>
          </tr>
        `;
      });
    }

    // Send email using Resend
    const { sendEmail } = require('../utils/email');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: #0d2865; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${invoice.tenant_name || 'CoreHR'}</h1>
        <p style="color: #41d8d1; margin: 5px 0 0 0; font-size: 12px;">Professional Consulting Services</p>
      </td>
    </tr>

    <!-- Invoice Header -->
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #0d2865; margin: 0 0 20px 0;">Invoice ${invoice.invoice_number}</h2>

        <p style="color: #666; margin: 0 0 5px 0;">Dear ${invoice.client_contact || invoice.client_name},</p>
        <p style="color: #666; margin: 0 0 20px 0;">Please find your invoice details below.</p>

        <table width="100%" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; background-color: #f9fafb;">
              <strong style="color: #333;">Invoice Date:</strong><br>
              <span style="color: #666;">${new Date(invoice.invoice_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </td>
            <td style="padding: 10px; background-color: #f9fafb;">
              <strong style="color: #333;">Due Date:</strong><br>
              <span style="color: #666;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'On Receipt'}</span>
            </td>
            <td style="padding: 10px; background-color: #f9fafb;">
              <strong style="color: #333;">Amount Due:</strong><br>
              <span style="color: #0d2865; font-weight: bold; font-size: 16px;">${formatNGN(invoice.total_amount)}</span>
            </td>
          </tr>
        </table>

        ${items.length > 0 ? `
        <!-- Items Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #e5e7eb;">
          <tr style="background-color: #41d8d1;">
            <th style="padding: 10px; text-align: left; color: #0d2865;">Description</th>
            <th style="padding: 10px; text-align: right; color: #0d2865;">Qty</th>
            <th style="padding: 10px; text-align: right; color: #0d2865;">Unit Price</th>
            <th style="padding: 10px; text-align: right; color: #0d2865;">Amount</th>
          </tr>
          ${itemsHtml}
        </table>
        ` : ''}

        <!-- Totals -->
        <table width="100%" style="margin-bottom: 30px;">
          <tr>
            <td width="60%"></td>
            <td width="40%">
              <table width="100%">
                <tr>
                  <td style="padding: 5px 0; color: #666;">Subtotal:</td>
                  <td style="padding: 5px 0; text-align: right;">${formatNGN(invoice.subtotal)}</td>
                </tr>
                ${invoice.vat_amount > 0 ? `
                <tr>
                  <td style="padding: 5px 0; color: #666;">VAT (${invoice.vat_rate || 7.5}%):</td>
                  <td style="padding: 5px 0; text-align: right;">${formatNGN(invoice.vat_amount)}</td>
                </tr>
                ` : ''}
                ${invoice.wht_amount > 0 ? `
                <tr>
                  <td style="padding: 5px 0; color: #666;">WHT (${invoice.wht_rate || 5}%):</td>
                  <td style="padding: 5px 0; text-align: right; color: #dc2626;">-${formatNGN(invoice.wht_amount)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #0d2865;">
                  <td style="padding: 10px 0; color: #0d2865; font-weight: bold; font-size: 16px;">Total:</td>
                  <td style="padding: 10px 0; text-align: right; color: #0d2865; font-weight: bold; font-size: 16px;">${formatNGN(invoice.total_amount)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${invoice.notes ? `
        <div style="padding: 15px; background-color: #f9fafb; border-left: 3px solid #41d8d1; margin-bottom: 20px;">
          <strong style="color: #333;">Notes:</strong><br>
          <span style="color: #666;">${invoice.notes}</span>
        </div>
        ` : ''}

        <p style="color: #666; margin: 20px 0;">Please include the invoice number <strong>${invoice.invoice_number}</strong> with your payment.</p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f3f4f6; padding: 20px; text-align: center;">
        <p style="color: #666; margin: 0 0 10px 0; font-size: 12px;">Thank you for your business!</p>
        <p style="color: #41d8d1; margin: 0; font-size: 11px;">Powered by CoreHR</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await sendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from ${invoice.tenant_name || 'CoreHR'}`,
      html: emailHtml
    });

    // Update invoice status to sent if it was draft
    if (invoice.status === 'draft') {
      await pool.query(
        `UPDATE invoices SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );
    }

    res.json({
      success: true,
      message: `Invoice sent to ${invoice.client_email}`
    });

  } catch (error) {
    console.error('Send invoice email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invoice email' });
  }
});

// GET /api/invoices/receivables - Get receivables summary
router.get('/reports/receivables', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as current,
        SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_1_30,
        SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_31_60,
        SUM(CASE WHEN due_date < CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_over_60
       FROM invoices
       WHERE tenant_id = $1 AND status IN ('sent', 'overdue', 'partial') AND deleted_at IS NULL`,
      [req.tenant_id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Receivables report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch receivables' });
  }
});

module.exports = router;
