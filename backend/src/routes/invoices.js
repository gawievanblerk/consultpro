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
