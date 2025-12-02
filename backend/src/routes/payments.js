/**
 * Payment Routes - Finance Module (Module 1.4)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/payments - List all payments
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, invoice_id, client_id, from_date, to_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.tenant_id = $1 AND p.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (invoice_id) {
      whereClause += ` AND p.invoice_id = $${paramIndex}`;
      params.push(invoice_id);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND i.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND p.payment_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND p.payment_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT p.*, i.invoice_number, c.company_name as client_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       ${whereClause}
       ORDER BY p.payment_date DESC
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
    console.error('List payments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id - Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, i.invoice_number, c.company_name as client_name
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment' });
  }
});

// POST /api/payments - Record new payment
router.post('/', async (req, res) => {
  try {
    const {
      invoice_id, amount, payment_date, payment_method,
      reference_number, bank_name, notes
    } = req.body;

    if (!invoice_id || !amount || !payment_date) {
      return res.status(400).json({
        success: false,
        error: 'Invoice, amount, and payment date are required'
      });
    }

    // Get invoice details
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [invoice_id, req.tenant_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const currentPaid = parseFloat(invoice.paid_amount || 0);
    const newTotalPaid = currentPaid + parseFloat(amount);
    const totalAmount = parseFloat(invoice.total_amount);

    const id = uuidv4();

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (
        id, tenant_id, invoice_id, amount, payment_date, payment_method,
        reference_number, bank_name, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, req.tenant_id, invoice_id, amount, payment_date, payment_method,
        reference_number, bank_name, notes, req.user.id
      ]
    );

    // Update invoice paid amount and status
    let newStatus = invoice.status;
    if (newTotalPaid >= totalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    await pool.query(
      `UPDATE invoices
       SET paid_amount = $3, status = $4, payment_date = $5, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [invoice_id, req.tenant_id, newTotalPaid, newStatus, payment_date]
    );

    res.status(201).json({ success: true, data: paymentResult.rows[0] });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// DELETE /api/payments/:id - Soft delete payment
router.delete('/:id', async (req, res) => {
  try {
    // Get payment details first
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Soft delete payment
    await pool.query(
      'UPDATE payments SET deleted_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    // Update invoice paid amount
    const invoiceResult = await pool.query(
      'SELECT * FROM invoices WHERE id = $1',
      [payment.invoice_id]
    );

    if (invoiceResult.rows.length > 0) {
      const invoice = invoiceResult.rows[0];
      const newPaidAmount = Math.max(0, parseFloat(invoice.paid_amount) - parseFloat(payment.amount));

      let newStatus = 'sent';
      if (newPaidAmount >= parseFloat(invoice.total_amount)) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await pool.query(
        'UPDATE invoices SET paid_amount = $2, status = $3, updated_at = NOW() WHERE id = $1',
        [payment.invoice_id, newPaidAmount, newStatus]
      );
    }

    res.json({ success: true, message: 'Payment deleted successfully' });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment' });
  }
});

module.exports = router;
