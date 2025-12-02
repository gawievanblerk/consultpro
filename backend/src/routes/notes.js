/**
 * Notes Routes - Collaboration Module (Module 1.5)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/notes - List all notes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, entity_type, entity_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.tenant_id = $1 AND n.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (entity_type) {
      whereClause += ` AND n.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    if (entity_id) {
      whereClause += ` AND n.entity_id = $${paramIndex}`;
      params.push(entity_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notes n ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT n.* FROM notes n
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
    console.error('List notes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/:id - Get note by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch note' });
  }
});

// POST /api/notes - Create new note
router.post('/', async (req, res) => {
  try {
    const { entity_type, entity_id, content, is_private } = req.body;

    if (!entity_type || !entity_id || !content) {
      return res.status(400).json({
        success: false,
        error: 'Entity type, entity ID, and content are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO notes (id, tenant_id, entity_type, entity_id, content, is_private, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.tenant_id, entity_type, entity_id, content, is_private || false, req.user.id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ success: false, error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update note
router.put('/:id', async (req, res) => {
  try {
    const { content, is_private } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const result = await pool.query(
      `UPDATE notes
       SET content = $3, is_private = COALESCE($4, is_private), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id, content, is_private]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ success: false, error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Soft delete note
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notes SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

module.exports = router;
