const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure multer for policy document uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const POLICIES_DIR = path.join(UPLOAD_DIR, 'policies');

// Ensure upload directory exists
if (!fs.existsSync(POLICIES_DIR)) {
  fs.mkdirSync(POLICIES_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, POLICIES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for policy documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/webm'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, MP4, WebM'));
    }
  }
});

/**
 * GET /api/policies
 * List all policies with filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      category_id,
      company_id,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT
        p.*,
        pc.name as category_name,
        pc.code as category_code,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM policy_acknowledgments pa WHERE pa.policy_id = p.id) as acknowledgment_count
      FROM policies p
      LEFT JOIN policy_categories pc ON p.category_id = pc.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
    `;
    const params = [req.tenant_id];

    if (category_id) {
      params.push(category_id);
      query += ` AND p.category_id = $${params.length}`;
    }

    if (company_id) {
      params.push(company_id);
      query += ` AND (p.company_id = $${params.length} OR p.company_id IS NULL)`;
    }

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) as filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policies' });
  }
});

/**
 * GET /api/policies/:id
 * Get a single policy with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        p.*,
        pc.name as category_name,
        pc.code as category_code,
        u.first_name || ' ' || u.last_name as created_by_name,
        pub.first_name || ' ' || pub.last_name as published_by_name
      FROM policies p
      LEFT JOIN policy_categories pc ON p.category_id = pc.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN users pub ON p.published_by = pub.id
      WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    // Get version history
    const versions = await pool.query(
      `SELECT pv.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM policy_versions pv
       LEFT JOIN users u ON pv.created_by = u.id
       WHERE pv.policy_id = $1
       ORDER BY pv.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        versions: versions.rows
      }
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policy' });
  }
});

/**
 * POST /api/policies
 * Create a new policy
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      category_id,
      company_id,
      title,
      description,
      document_type = 'pdf',
      external_url,
      content_html,
      requires_acknowledgment = true,
      requires_training = false,
      new_hire_due_days = 30,
      renewal_frequency_months = 12,
      effective_date,
      expiry_date,
      tags
    } = req.body;

    if (!category_id || !title) {
      return res.status(400).json({ success: false, error: 'Category and title are required' });
    }

    // Handle file upload
    let file_path = null;
    let file_name = null;
    let file_size = null;
    let mime_type = null;

    if (req.file) {
      file_path = req.file.path;
      file_name = req.file.originalname;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
    }

    const result = await pool.query(
      `INSERT INTO policies (
        tenant_id, company_id, category_id, title, description,
        document_type, file_path, file_name, file_size, mime_type,
        external_url, content_html,
        requires_acknowledgment, requires_training,
        new_hire_due_days, renewal_frequency_months,
        effective_date, expiry_date, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        req.tenant_id,
        company_id || null,
        category_id,
        title,
        description || null,
        document_type,
        file_path,
        file_name,
        file_size,
        mime_type,
        external_url || null,
        content_html || null,
        requires_acknowledgment === 'true' || requires_acknowledgment === true,
        requires_training === 'true' || requires_training === true,
        parseInt(new_hire_due_days) || 30,
        parseInt(renewal_frequency_months) || 12,
        effective_date || null,
        expiry_date || null,
        tags ? (typeof tags === 'string' ? tags.split(',') : tags) : null,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ success: false, error: 'Failed to create policy' });
  }
});

/**
 * PUT /api/policies/:id
 * Update a policy
 */
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      company_id,
      title,
      description,
      document_type,
      external_url,
      content_html,
      requires_acknowledgment,
      requires_training,
      new_hire_due_days,
      renewal_frequency_months,
      effective_date,
      expiry_date,
      tags
    } = req.body;

    // Check if policy exists
    const existing = await pool.query(
      `SELECT * FROM policies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    // Handle file upload (replace existing)
    let file_path = existing.rows[0].file_path;
    let file_name = existing.rows[0].file_name;
    let file_size = existing.rows[0].file_size;
    let mime_type = existing.rows[0].mime_type;

    if (req.file) {
      // Delete old file if exists
      if (file_path && fs.existsSync(file_path)) {
        fs.unlinkSync(file_path);
      }
      file_path = req.file.path;
      file_name = req.file.originalname;
      file_size = req.file.size;
      mime_type = req.file.mimetype;
    }

    const result = await pool.query(
      `UPDATE policies SET
        category_id = COALESCE($1, category_id),
        company_id = $2,
        title = COALESCE($3, title),
        description = $4,
        document_type = COALESCE($5, document_type),
        file_path = $6,
        file_name = $7,
        file_size = $8,
        mime_type = $9,
        external_url = $10,
        content_html = $11,
        requires_acknowledgment = COALESCE($12, requires_acknowledgment),
        requires_training = COALESCE($13, requires_training),
        new_hire_due_days = COALESCE($14, new_hire_due_days),
        renewal_frequency_months = COALESCE($15, renewal_frequency_months),
        effective_date = $16,
        expiry_date = $17,
        tags = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19 AND tenant_id = $20
      RETURNING *`,
      [
        category_id,
        company_id || null,
        title,
        description,
        document_type,
        file_path,
        file_name,
        file_size,
        mime_type,
        external_url || null,
        content_html || null,
        requires_acknowledgment !== undefined ? (requires_acknowledgment === 'true' || requires_acknowledgment === true) : undefined,
        requires_training !== undefined ? (requires_training === 'true' || requires_training === true) : undefined,
        new_hire_due_days ? parseInt(new_hire_due_days) : undefined,
        renewal_frequency_months ? parseInt(renewal_frequency_months) : undefined,
        effective_date || null,
        expiry_date || null,
        tags ? (typeof tags === 'string' ? tags.split(',') : tags) : null,
        id,
        req.tenant_id
      ]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ success: false, error: 'Failed to update policy' });
  }
});

/**
 * PUT /api/policies/:id/publish
 * Publish a policy (creates version snapshot)
 */
router.put('/:id/publish', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { version_notes } = req.body;

    await client.query('BEGIN');

    // Get current policy
    const existing = await client.query(
      `SELECT * FROM policies WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    const policy = existing.rows[0];

    // Increment version if republishing
    let newVersion = policy.version;
    if (policy.status === 'published') {
      const parts = policy.version.split('.');
      parts[1] = parseInt(parts[1] || 0) + 1;
      newVersion = parts.join('.');
    }

    // Create version snapshot
    await client.query(
      `INSERT INTO policy_versions (policy_id, version, version_notes, document_snapshot, file_path, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        newVersion,
        version_notes || null,
        JSON.stringify(policy),
        policy.file_path,
        req.user.id
      ]
    );

    // Update policy status
    const result = await client.query(
      `UPDATE policies SET
        status = 'published',
        version = $1,
        version_notes = $2,
        published_at = CURRENT_TIMESTAMP,
        published_by = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [newVersion, version_notes || null, req.user.id, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Policy published successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error publishing policy:', error);
    res.status(500).json({ success: false, error: 'Failed to publish policy' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/policies/:id/archive
 * Archive a policy
 */
router.put('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE policies SET
        status = 'archived',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING *`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Policy archived successfully'
    });
  } catch (error) {
    console.error('Error archiving policy:', error);
    res.status(500).json({ success: false, error: 'Failed to archive policy' });
  }
});

/**
 * DELETE /api/policies/:id
 * Soft delete a policy
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE policies SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ success: false, error: 'Failed to delete policy' });
  }
});

/**
 * GET /api/policies/:id/download
 * Download policy document
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT file_path, file_name FROM policies
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    const { file_path, file_name } = result.rows[0];

    if (!file_path || !fs.existsSync(file_path)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.download(file_path, file_name);
  } catch (error) {
    console.error('Error downloading policy:', error);
    res.status(500).json({ success: false, error: 'Failed to download policy' });
  }
});

/**
 * POST /api/policies/:id/acknowledge
 * Employee acknowledges a policy
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { signature_data } = req.body;

    // Get policy
    const policy = await pool.query(
      `SELECT * FROM policies WHERE id = $1 AND tenant_id = $2 AND status = 'published' AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (policy.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy not found or not published' });
    }

    // Get employee linked to user
    const employee = await pool.query(
      `SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (employee.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No employee record found for user' });
    }

    const employeeId = employee.rows[0].id;
    const policyData = policy.rows[0];

    // Check for existing acknowledgment of this version
    const existing = await pool.query(
      `SELECT id FROM policy_acknowledgments
       WHERE employee_id = $1 AND policy_id = $2 AND policy_version = $3`,
      [employeeId, id, policyData.version]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Policy already acknowledged' });
    }

    // Calculate due date and if overdue
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + policyData.new_hire_due_days);
    const wasOverdue = new Date() > dueDate;

    // Create acknowledgment
    const result = await pool.query(
      `INSERT INTO policy_acknowledgments (
        tenant_id, employee_id, policy_id, policy_version,
        acknowledged_at, ip_address, user_agent, signature_data, due_date, was_overdue
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.tenant_id,
        employeeId,
        id,
        policyData.version,
        req.ip,
        req.get('User-Agent'),
        signature_data || null,
        dueDate,
        wasOverdue
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Policy acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging policy:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge policy' });
  }
});

/**
 * GET /api/policies/:id/acknowledgments
 * Get acknowledgment status for a policy
 */
router.get('/:id/acknowledgments', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.query;

    let query = `
      SELECT
        pa.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.department,
        c.name as company_name
      FROM policy_acknowledgments pa
      JOIN employees e ON pa.employee_id = e.id
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE pa.policy_id = $1 AND pa.tenant_id = $2
    `;
    const params = [id, req.tenant_id];

    if (company_id) {
      params.push(company_id);
      query += ` AND e.company_id = $${params.length}`;
    }

    query += ` ORDER BY pa.acknowledged_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching acknowledgments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch acknowledgments' });
  }
});

/**
 * GET /api/policies/employee/all
 * Get all policies for current employee (pending and acknowledged)
 */
router.get('/employee/all', async (req, res) => {
  try {
    // Get employee linked to user
    const employee = await pool.query(
      `SELECT id, company_id FROM employees WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (employee.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { id: employeeId, company_id } = employee.rows[0];

    // Get all published policies for employee's company (including acknowledged ones)
    const result = await pool.query(
      `SELECT
        p.*,
        pc.name as category_name,
        pa.acknowledged_at,
        pa.signature_data,
        CASE
          WHEN pa.acknowledged_at IS NOT NULL THEN 'acknowledged'
          WHEN p.requires_acknowledgment AND pa.acknowledged_at IS NULL THEN 'pending'
          ELSE 'info_only'
        END as acknowledgment_status
      FROM policies p
      JOIN policy_categories pc ON p.category_id = pc.id
      LEFT JOIN policy_acknowledgments pa ON pa.policy_id = p.id
        AND pa.employee_id = $3
        AND pa.policy_version = p.version
      WHERE p.tenant_id = $1
        AND p.status = 'published'
        AND p.deleted_at IS NULL
        AND (p.company_id = $2 OR p.company_id IS NULL)
      ORDER BY
        CASE WHEN pa.acknowledged_at IS NULL AND p.requires_acknowledgment THEN 0 ELSE 1 END,
        p.published_at DESC`,
      [req.tenant_id, company_id, employeeId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching employee policies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policies' });
  }
});

/**
 * GET /api/policies/employee/pending
 * Get pending policies for current employee
 */
router.get('/employee/pending', async (req, res) => {
  try {
    // Get employee linked to user
    const employee = await pool.query(
      `SELECT id, company_id FROM employees WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (employee.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { id: employeeId, company_id } = employee.rows[0];

    // Get published policies not yet acknowledged by employee
    const result = await pool.query(
      `SELECT
        p.*,
        pc.name as category_name
      FROM policies p
      JOIN policy_categories pc ON p.category_id = pc.id
      WHERE p.tenant_id = $1
        AND p.status = 'published'
        AND p.deleted_at IS NULL
        AND p.requires_acknowledgment = true
        AND (p.company_id = $2 OR p.company_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM policy_acknowledgments pa
          WHERE pa.policy_id = p.id
            AND pa.employee_id = $3
            AND pa.policy_version = p.version
        )
      ORDER BY p.published_at DESC`,
      [req.tenant_id, company_id, employeeId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pending policies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending policies' });
  }
});

module.exports = router;
