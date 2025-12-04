/**
 * Staff Routes - HR Outsourcing Module (Module 1.3)
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { sendInviteEmail } = require('../utils/email');

// GET /api/staff - List all staff
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, available } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.tenant_id = $1 AND s.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (available === 'true') {
      whereClause += ` AND s.is_available = true`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM staff s ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM deployments d WHERE d.staff_id = s.id AND d.status = 'active') as active_deployments,
        u.id as user_id,
        u.role as user_role
       FROM staff s
       LEFT JOIN users u ON LOWER(s.email) = LOWER(u.email) AND u.tenant_id = s.tenant_id AND u.deleted_at IS NULL
       ${whereClause}
       ORDER BY s.last_name, s.first_name
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
    console.error('List staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// GET /api/staff/export - Export staff to CSV (MUST BE BEFORE :id route)
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const result = await pool.query(
      `SELECT s.employee_id, s.first_name, s.last_name, s.email, s.phone,
              s.job_title, s.department, s.status, s.is_available,
              s.employment_type, s.hire_date
       FROM staff s
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.last_name, s.first_name`,
      [req.tenant_id]
    );

    if (format === 'csv') {
      const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Department', 'Status', 'Available', 'Employment Type', 'Hire Date'];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        csvRows.push([
          row.employee_id || '',
          row.first_name || '',
          row.last_name || '',
          row.email || '',
          row.phone || '',
          row.job_title || '',
          row.department || '',
          row.status || '',
          row.is_available ? 'Yes' : 'No',
          row.employment_type || '',
          row.hire_date ? new Date(row.hire_date).toISOString().split('T')[0] : ''
        ].map(v => `"${v}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=staff.csv');
      return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Export staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to export staff' });
  }
});

// GET /api/staff/:id - Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        (SELECT json_agg(d) FROM deployments d WHERE d.staff_id = s.id AND d.deleted_at IS NULL) as deployments
       FROM staff s
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// Helper to generate employee ID
async function generateEmployeeId(tenantId) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM staff WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  return `EMP-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
}

// POST /api/staff - Create new staff
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, job_title, department,
      skills, salary, salary_currency, bank_name, bank_account_number, bank_account_name,
      tax_id, date_of_birth, gender, employment_type, hire_date,
      nin, bvn, pension_pin, notes
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    const id = uuidv4();
    const employee_id = await generateEmployeeId(req.tenant_id);

    const result = await pool.query(
      `INSERT INTO staff (
        id, tenant_id, employee_id, first_name, last_name, email, phone, job_title, department,
        skills, salary, salary_currency, bank_name, bank_account_number, bank_account_name,
        tax_id, date_of_birth, gender, employment_type, hire_date,
        nin, bvn, pension_pin, notes, status, is_available, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'active', true, $25)
      RETURNING *`,
      [
        id, req.tenant_id, employee_id, first_name, last_name, email, phone, job_title, department,
        skills, salary, salary_currency || 'NGN', bank_name, bank_account_number, bank_account_name,
        tax_id, date_of_birth, gender, employment_type || 'outsourced', hire_date || new Date(),
        nin, bvn, pension_pin, notes, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to create staff' });
  }
});

// PUT /api/staff/:id - Update staff
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'job_title', 'department',
      'skills', 'salary', 'salary_currency', 'bank_name', 'bank_account_number', 'bank_account_name',
      'tax_id', 'date_of_birth', 'gender', 'employment_type', 'hire_date',
      'nin', 'bvn', 'pension_pin', 'notes', 'status', 'is_available'
    ];

    const updateFields = [];
    const values = [id, req.tenant_id];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE staff SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to update staff' });
  }
});

// DELETE /api/staff/:id - Soft delete staff
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE staff SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted successfully' });

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete staff' });
  }
});

// POST /api/staff/:id/invite - Invite staff member to create user account
router.post('/:id/invite', async (req, res) => {
  try {
    const { role = 'user' } = req.body;

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: admin, manager, or user'
      });
    }

    // Get staff record
    const staffResult = await pool.query(
      `SELECT id, first_name, last_name, email FROM staff
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    const staff = staffResult.rows[0];

    if (!staff.email) {
      return res.status(400).json({
        success: false,
        error: 'Staff member has no email address'
      });
    }

    const email = staff.email.toLowerCase().trim();

    // Check if user already exists with this email
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [email, req.tenant_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A user account already exists for this email'
      });
    }

    // Check for existing pending invite
    const existingInvite = await pool.query(
      `SELECT id FROM user_invites
       WHERE email = $1 AND tenant_id = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email, req.tenant_id]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An invitation has already been sent to this email'
      });
    }

    // Get tenant info and inviter name
    const tenantResult = await pool.query(
      'SELECT name FROM tenants WHERE id = $1',
      [req.tenant_id]
    );
    const organizationName = tenantResult.rows[0]?.name || 'ConsultPro';

    const inviterName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : req.user.email;

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite record
    const inviteResult = await pool.query(
      `INSERT INTO user_invites (tenant_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, expires_at, created_at`,
      [req.tenant_id, email, role, token, req.user.id, expiresAt]
    );

    // Send invitation email
    try {
      await sendInviteEmail(email, token, inviterName, organizationName, role);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Delete the invite if email fails
      await pool.query('DELETE FROM user_invites WHERE id = $1', [inviteResult.rows[0].id]);
      return res.status(500).json({
        success: false,
        error: 'Failed to send invitation email'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        id: inviteResult.rows[0].id,
        email: inviteResult.rows[0].email,
        role: inviteResult.rows[0].role,
        expiresAt: inviteResult.rows[0].expires_at
      }
    });

  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

module.exports = router;
