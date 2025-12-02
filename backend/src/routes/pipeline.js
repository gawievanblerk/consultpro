/**
 * Pipeline Routes - Business Development Module (Module 1.2)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/pipeline/stages - Get pipeline stages
router.get('/stages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*,
        (SELECT COUNT(*) FROM leads WHERE stage_id = ps.id AND deleted_at IS NULL) as lead_count,
        (SELECT COALESCE(SUM(estimated_value), 0) FROM leads WHERE stage_id = ps.id AND deleted_at IS NULL) as total_value
       FROM pipeline_stages ps
       WHERE ps.tenant_id = $1 AND ps.is_active = true
       ORDER BY ps.order_index`,
      [req.tenant_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get pipeline stages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline stages' });
  }
});

// POST /api/pipeline/stages - Create pipeline stage
router.post('/stages', async (req, res) => {
  try {
    const { name, description, probability, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Stage name is required' });
    }

    // Get next order index
    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM pipeline_stages WHERE tenant_id = $1',
      [req.tenant_id]
    );

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO pipeline_stages (id, tenant_id, name, description, probability, color, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.tenant_id, name, description, probability || 50, color || '#3B82F6', orderResult.rows[0].next_order]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create pipeline stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to create pipeline stage' });
  }
});

// PUT /api/pipeline/stages/:id - Update pipeline stage
router.put('/stages/:id', async (req, res) => {
  try {
    const { name, description, probability, color, order_index, is_active } = req.body;

    const result = await pool.query(
      `UPDATE pipeline_stages
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           probability = COALESCE($5, probability),
           color = COALESCE($6, color),
           order_index = COALESCE($7, order_index),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [req.params.id, req.tenant_id, name, description, probability, color, order_index, is_active]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pipeline stage not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update pipeline stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to update pipeline stage' });
  }
});

// GET /api/pipeline/board - Get Kanban board data
router.get('/board', async (req, res) => {
  try {
    // Get all stages with their leads
    const stages = await pool.query(
      `SELECT ps.*
       FROM pipeline_stages ps
       WHERE ps.tenant_id = $1 AND ps.is_active = true
       ORDER BY ps.order_index`,
      [req.tenant_id]
    );

    const leads = await pool.query(
      `SELECT l.*, ps.name as stage_name
       FROM leads l
       LEFT JOIN pipeline_stages ps ON l.stage_id = ps.id
       WHERE l.tenant_id = $1 AND l.deleted_at IS NULL AND l.status NOT IN ('won', 'lost')
       ORDER BY l.created_at DESC`,
      [req.tenant_id]
    );

    // Group leads by stage
    const board = stages.rows.map(stage => ({
      ...stage,
      leads: leads.rows.filter(lead => lead.stage_id === stage.id)
    }));

    res.json({ success: true, data: board });

  } catch (error) {
    console.error('Get pipeline board error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline board' });
  }
});

// GET /api/pipeline/forecast - Get revenue forecast
router.get('/forecast', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        ps.name as stage,
        ps.probability,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(l.estimated_value), 0) as total_value,
        COALESCE(SUM(l.estimated_value * ps.probability / 100), 0) as weighted_value
       FROM pipeline_stages ps
       LEFT JOIN leads l ON l.stage_id = ps.id AND l.tenant_id = $1 AND l.deleted_at IS NULL AND l.status NOT IN ('won', 'lost')
       WHERE ps.tenant_id = $1 AND ps.is_active = true
       GROUP BY ps.id, ps.name, ps.probability, ps.order_index
       ORDER BY ps.order_index`,
      [req.tenant_id]
    );

    const totals = {
      total_value: result.rows.reduce((sum, row) => sum + parseFloat(row.total_value), 0),
      weighted_value: result.rows.reduce((sum, row) => sum + parseFloat(row.weighted_value), 0),
      lead_count: result.rows.reduce((sum, row) => sum + parseInt(row.lead_count), 0)
    };

    res.json({
      success: true,
      data: {
        stages: result.rows,
        totals
      }
    });

  } catch (error) {
    console.error('Get pipeline forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecast' });
  }
});

module.exports = router;
