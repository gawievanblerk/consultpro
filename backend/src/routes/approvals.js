/**
 * Approvals Routes - Collaboration Module (Module 1.5)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// GET /api/approvals/pending - Get pending approvals for user
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              CASE
                WHEN a.entity_type = 'invoice' THEN (SELECT invoice_number FROM invoices WHERE id = a.entity_id)
                WHEN a.entity_type = 'proposal' THEN (SELECT proposal_number FROM proposals WHERE id = a.entity_id)
                ELSE NULL
              END as entity_reference
       FROM approvals a
       WHERE a.approver_id = $1 AND a.tenant_id = $2 AND a.status = 'pending'
       ORDER BY a.created_at DESC`,
      [req.user.id, req.tenant_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending approvals' });
  }
});

// POST /api/approvals/:id/approve - Approve item
router.post('/:id/approve', async (req, res) => {
  try {
    const { comments } = req.body;

    const result = await pool.query(
      `UPDATE approvals SET
        status = 'approved',
        comments = $1,
        approved_at = NOW(),
        updated_at = NOW()
       WHERE id = $2 AND approver_id = $3 AND tenant_id = $4 AND status = 'pending'
       RETURNING *`,
      [comments, req.params.id, req.user.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval not found or already processed' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve' });
  }
});

// POST /api/approvals/:id/reject - Reject item
router.post('/:id/reject', async (req, res) => {
  try {
    const { comments } = req.body;

    const result = await pool.query(
      `UPDATE approvals SET
        status = 'rejected',
        comments = $1,
        rejected_at = NOW(),
        updated_at = NOW()
       WHERE id = $2 AND approver_id = $3 AND tenant_id = $4 AND status = 'pending'
       RETURNING *`,
      [comments, req.params.id, req.user.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval not found or already processed' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject' });
  }
});

module.exports = router;
