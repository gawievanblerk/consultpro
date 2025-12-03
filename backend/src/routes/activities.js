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
    const { page = 1, limit = 20, entity_type, entity_id, activity_type, from_date, to_date, user_id } = req.query;
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

    if (from_date) {
      whereClause += ` AND a.performed_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND a.performed_at <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    if (user_id) {
      whereClause += ` AND a.performed_by = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_logs a ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT a.* FROM activity_logs a
       ${whereClause}
       ORDER BY a.performed_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Flatten metadata for each activity
    const data = result.rows.map(row => {
      const metadata = row.metadata || {};
      return {
        ...row,
        subject: metadata.subject,
        outcome: metadata.outcome,
        duration_minutes: metadata.duration_minutes,
        follow_up_date: metadata.follow_up_date,
        follow_up_notes: metadata.follow_up_notes,
        participants: metadata.participants,
        activity_date: metadata.activity_date || row.performed_at
      };
    });

    res.json({
      success: true,
      data,
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
      outcome, activity_date, duration_minutes, follow_up_date, follow_up_notes,
      participants
    } = req.body;

    if (!entity_type || !entity_id || !activity_type) {
      return res.status(400).json({
        success: false,
        error: 'Entity type, entity ID, and activity type are required'
      });
    }

    // Validate that future dates are only allowed for follow-up type activities
    if (activity_date) {
      const activityDateObj = new Date(activity_date);
      const now = new Date();
      if (activityDateObj > now && activity_type !== 'follow_up') {
        return res.status(400).json({
          success: false,
          error: 'Future activity dates are only allowed for follow-up activities'
        });
      }
    }

    const id = uuidv4();

    // Store extra fields in metadata JSON column
    const metadata = {
      subject,
      outcome,
      duration_minutes,
      follow_up_date,
      follow_up_notes,
      participants,
      activity_date: activity_date || new Date().toISOString()
    };

    const result = await pool.query(
      `INSERT INTO activity_logs (
        id, tenant_id, entity_type, entity_id, activity_type,
        description, metadata, performed_by, performed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id, req.tenant_id, entity_type, entity_id, activity_type,
        description || subject, JSON.stringify(metadata), req.user.id, activity_date || new Date()
      ]
    );

    // Flatten the response to include metadata fields at top level
    const data = {
      ...result.rows[0],
      subject: metadata.subject,
      outcome: metadata.outcome,
      duration_minutes: metadata.duration_minutes,
      follow_up_date: metadata.follow_up_date,
      follow_up_notes: metadata.follow_up_notes,
      participants: metadata.participants,
      activity_date: metadata.activity_date
    };

    res.status(201).json({ success: true, data });

  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

module.exports = router;
