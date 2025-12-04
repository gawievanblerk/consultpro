/**
 * Audit Trail Routes - Collaboration Module (Module 1.5)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// GET /api/audit - List audit entries
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      entity_type,
      entity_id,
      action,
      user_id,
      from_date,
      to_date
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.tenant_id = $1';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (entity_type) {
      whereClause += ` AND a.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    if (entity_id) {
      whereClause += ` AND a.entity_id = $${paramIndex}`;
      params.push(entity_id);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (user_id) {
      whereClause += ` AND a.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (from_date) {
      whereClause += ` AND a.created_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND a.created_at <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_trail a ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT a.*, u.email as user_email, u.first_name, u.last_name
       FROM audit_trail a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
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
    console.error('List audit error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit entries' });
  }
});

// GET /api/audit/export - Export audit log to CSV
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', from_date, to_date } = req.query;

    let whereClause = 'WHERE a.tenant_id = $1';
    let params = [req.tenant_id];

    if (from_date) {
      whereClause += ' AND a.created_at >= $2';
      params.push(from_date);
    }

    if (to_date) {
      whereClause += ` AND a.created_at <= $${params.length + 1}`;
      params.push(to_date);
    }

    const result = await pool.query(
      `SELECT a.*, u.email as user_email
       FROM audit_trail a
       LEFT JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC`,
      params
    );

    if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Changes'];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        csvRows.push([
          row.created_at || '',
          row.user_email || '',
          row.action || '',
          row.entity_type || '',
          row.entity_id || '',
          JSON.stringify(row.changes || {}).replace(/"/g, '""')
        ].map(v => `"${v}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_log.csv');
      return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Export audit error:', error);
    res.status(500).json({ success: false, error: 'Failed to export audit log' });
  }
});

module.exports = router;
