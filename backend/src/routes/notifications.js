/**
 * Notifications Routes - Collaboration Module (Module 1.5)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/notifications - Get user notifications
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.user_id = $1 AND n.tenant_id = $2';
    let params = [req.user.id, req.tenant_id];
    let paramIndex = 3;

    if (type) {
      whereClause += ` AND n.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (read !== undefined) {
      whereClause += ` AND n.read = $${paramIndex}`;
      params.push(read === 'true');
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notifications n ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT n.*
       FROM notifications n
       ${whereClause}
       ORDER BY n.created_at DESC
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
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND tenant_id = $2 AND read = false`,
      [req.user.id, req.tenant_id]
    );

    res.json({
      success: true,
      data: { unread_count: parseInt(result.rows[0].count) }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND tenant_id = $3
       RETURNING *`,
      [req.params.id, req.user.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read = true, read_at = NOW()
       WHERE user_id = $1 AND tenant_id = $2 AND read = false`,
      [req.user.id, req.tenant_id]
    );

    res.json({ success: true, message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
