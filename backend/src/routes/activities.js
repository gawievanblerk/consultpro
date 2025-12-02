/**
 * Activity Routes - CRM Module (Module 1.1)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/activities - List activities
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, entity_type, entity_id, activity_type } = req.query;
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

    if (activity_type) {
      whereClause += ` AND a.activity_type = $${paramIndex}`;
      params.push(activity_type);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_logs a ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT a.* FROM activity_logs a
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
    console.error('List activities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activities' });
  }
});

// POST /api/activities - Log activity
router.post('/', async (req, res) => {
  try {
    const {
      entity_type, entity_id, activity_type, subject, description,
      outcome, activity_date, duration_minutes, follow_up_date, follow_up_notes
    } = req.body;

    if (!entity_type || !entity_id || !activity_type) {
      return res.status(400).json({
        success: false,
        error: 'Entity type, entity ID, and activity type are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO activity_logs (
        id, tenant_id, entity_type, entity_id, activity_type,
        subject, description, outcome, activity_date, duration_minutes,
        follow_up_date, follow_up_notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, req.tenant_id, entity_type, entity_id, activity_type,
        subject, description, outcome, activity_date || new Date(),
        duration_minutes, follow_up_date, follow_up_notes, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

module.exports = router;
