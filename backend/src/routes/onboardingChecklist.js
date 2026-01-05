const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// ============================================================================
// ONBOARDING CHECKLISTS
// ============================================================================

// Default onboarding checklist items
const DEFAULT_CHECKLIST_ITEMS = [
  { item: 'Complete personal information form', category: 'hr', required: true },
  { item: 'Submit bank account details', category: 'hr', required: true },
  { item: 'Submit pension (PFA) details', category: 'hr', required: true },
  { item: 'Submit BVN and NIN', category: 'hr', required: true },
  { item: 'Submit Tax ID (TIN)', category: 'hr', required: false },
  { item: 'Submit emergency contact information', category: 'hr', required: true },
  { item: 'Upload passport photograph', category: 'documents', required: true },
  { item: 'Upload educational certificates', category: 'documents', required: true },
  { item: 'Upload professional certifications', category: 'documents', required: false },
  { item: 'Upload signed employment contract', category: 'documents', required: true },
  { item: 'Upload signed offer letter', category: 'documents', required: true },
  { item: 'Acknowledge Code of Conduct policy', category: 'policies', required: true },
  { item: 'Acknowledge Employment Policy', category: 'policies', required: true },
  { item: 'Acknowledge Data Protection Policy', category: 'policies', required: true },
  { item: 'Acknowledge IT Usage Policy', category: 'policies', required: false },
  { item: 'Complete IT setup (email, systems access)', category: 'it', required: true },
  { item: 'Receive company ID card', category: 'admin', required: false },
  { item: 'Complete workspace setup', category: 'admin', required: true },
  { item: 'Meet with direct supervisor', category: 'orientation', required: true },
  { item: 'Complete team introduction', category: 'orientation', required: true },
  { item: 'Complete department orientation', category: 'orientation', required: true },
  { item: 'Complete company orientation', category: 'orientation', required: false }
];

// GET /api/onboarding-checklist/checklists - List onboarding checklists
router.get('/checklists', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, status } = req.query;

    let query = `
      SELECT
        oc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        c.trading_name as company_name
      FROM onboarding_checklists oc
      JOIN employees e ON oc.employee_id = e.id
      JOIN companies c ON oc.company_id = c.id
      WHERE oc.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND oc.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND oc.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (status) {
      query += ` AND oc.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY oc.created_at DESC';

    const result = await pool.query(query, params);

    // Calculate progress for each checklist
    const checklists = result.rows.map(row => {
      const items = row.items || [];
      const totalItems = items.length;
      const completedItems = items.filter(i => i.completed).length;
      return {
        ...row,
        progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        completedCount: completedItems,
        totalCount: totalItems
      };
    });

    res.json({ success: true, data: checklists });
  } catch (error) {
    console.error('Error fetching onboarding checklists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding checklists' });
  }
});

// GET /api/onboarding-checklist/checklists/:id - Get single checklist
router.get('/checklists/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        oc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        e.email as employee_email,
        c.trading_name as company_name,
        c.legal_name
      FROM onboarding_checklists oc
      JOIN employees e ON oc.employee_id = e.id
      JOIN companies c ON oc.company_id = c.id
      WHERE oc.id = $1 AND oc.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Onboarding checklist not found' });
    }

    const checklist = result.rows[0];
    const items = checklist.items || [];
    checklist.progress = items.length > 0 ? Math.round((items.filter(i => i.completed).length / items.length) * 100) : 0;

    res.json({ success: true, data: checklist });
  } catch (error) {
    console.error('Error fetching onboarding checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding checklist' });
  }
});

// POST /api/onboarding-checklist/checklists - Create onboarding checklist for employee
router.post('/checklists', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { company_id, employee_id, items } = req.body;

    // Use provided items or default checklist
    const checklistItems = items || DEFAULT_CHECKLIST_ITEMS.map(item => ({
      ...item,
      completed: false,
      completed_at: null,
      completed_by: null
    }));

    const result = await pool.query(`
      INSERT INTO onboarding_checklists (
        tenant_id, company_id, employee_id, items, status, created_by
      ) VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *
    `, [tenantId, company_id, employee_id, JSON.stringify(checklistItems), userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating onboarding checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to create onboarding checklist' });
  }
});

// PUT /api/onboarding-checklist/checklists/:id/item - Update single item in checklist
router.put('/checklists/:id/item', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { itemIndex, completed, notes } = req.body;

    // Get current checklist
    const checklistResult = await pool.query(
      'SELECT * FROM onboarding_checklists WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist not found' });
    }

    const checklist = checklistResult.rows[0];
    const items = checklist.items || [];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({ success: false, error: 'Invalid item index' });
    }

    // Update the item
    items[itemIndex] = {
      ...items[itemIndex],
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
      notes: notes || items[itemIndex].notes
    };

    // Check if all items are completed
    const allCompleted = items.every(item => item.completed || !item.required);
    const anyStarted = items.some(item => item.completed);

    let newStatus = checklist.status;
    if (allCompleted) {
      newStatus = 'completed';
    } else if (anyStarted) {
      newStatus = 'in_progress';
    }

    const result = await pool.query(`
      UPDATE onboarding_checklists
      SET items = $1,
          status = $2,
          started_at = CASE WHEN started_at IS NULL AND $2 = 'in_progress' THEN NOW() ELSE started_at END,
          completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE NULL END,
          completed_by = CASE WHEN $2 = 'completed' THEN $3 ELSE NULL END,
          updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [JSON.stringify(items), newStatus, userId, id, tenantId]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ success: false, error: 'Failed to update checklist item' });
  }
});

// PUT /api/onboarding-checklist/checklists/:id - Update entire checklist
router.put('/checklists/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { items, status } = req.body;

    const result = await pool.query(`
      UPDATE onboarding_checklists
      SET items = COALESCE($1, items),
          status = COALESCE($2, status),
          completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
          completed_by = CASE WHEN $2 = 'completed' THEN $3 ELSE completed_by END,
          updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [items ? JSON.stringify(items) : null, status, userId, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to update checklist' });
  }
});

// ============================================================================
// POLICY ACKNOWLEDGEMENTS
// ============================================================================

// GET /api/onboarding-checklist/policy-acknowledgements - List policy acknowledgements
router.get('/policy-acknowledgements', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, policy_id, status } = req.query;

    let query = `
      SELECT
        pa.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        p.title as policy_name,
        p.document_type as policy_type,
        c.trading_name as company_name
      FROM policy_acknowledgements pa
      LEFT JOIN employees e ON pa.employee_id = e.id
      LEFT JOIN policies p ON pa.policy_id = p.id
      LEFT JOIN companies c ON pa.company_id = c.id
      WHERE pa.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND pa.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND pa.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (policy_id) {
      query += ` AND pa.policy_id = $${paramIdx++}`;
      params.push(policy_id);
    }
    if (status) {
      query += ` AND pa.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY pa.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching policy acknowledgements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policy acknowledgements' });
  }
});

// POST /api/onboarding-checklist/policy-acknowledgements - Create pending acknowledgements for employee
router.post('/policy-acknowledgements', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, policy_ids } = req.body;

    if (!policy_ids || policy_ids.length === 0) {
      // Get all active policies that require acknowledgement
      const policiesResult = await pool.query(`
        SELECT id FROM policies
        WHERE tenant_id = $1
          AND (company_id = $2 OR company_id IS NULL)
          AND is_active = true
          AND requires_acknowledgement = true
      `, [tenantId, company_id]);

      if (policiesResult.rows.length === 0) {
        return res.json({ success: true, data: [], message: 'No policies require acknowledgement' });
      }

      const policyIdsToCreate = policiesResult.rows.map(p => p.id);

      // Create acknowledgement records
      const insertValues = policyIdsToCreate.map((policyId, idx) =>
        `($1, $2, $3, $${idx + 4}, 'pending')`
      ).join(', ');

      const result = await pool.query(`
        INSERT INTO policy_acknowledgements (tenant_id, company_id, employee_id, policy_id, status)
        VALUES ${insertValues}
        ON CONFLICT (employee_id, policy_id) DO NOTHING
        RETURNING *
      `, [tenantId, company_id, employee_id, ...policyIdsToCreate]);

      return res.status(201).json({ success: true, data: result.rows });
    }

    // Create for specific policies
    const insertValues = policy_ids.map((policyId, idx) =>
      `($1, $2, $3, $${idx + 4}, 'pending')`
    ).join(', ');

    const result = await pool.query(`
      INSERT INTO policy_acknowledgements (tenant_id, company_id, employee_id, policy_id, status)
      VALUES ${insertValues}
      ON CONFLICT (employee_id, policy_id) DO NOTHING
      RETURNING *
    `, [tenantId, company_id, employee_id, ...policy_ids]);

    res.status(201).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error creating policy acknowledgements:', error);
    res.status(500).json({ success: false, error: 'Failed to create policy acknowledgements' });
  }
});

// POST /api/onboarding-checklist/policy-acknowledgements/:id/acknowledge - Employee acknowledges policy
router.post('/policy-acknowledgements/:id/acknowledge', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { signature_data } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await pool.query(`
      UPDATE policy_acknowledgements
      SET status = 'acknowledged',
          acknowledged_at = NOW(),
          acknowledgement_method = 'digital',
          ip_address = $1,
          signature_data = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [ipAddress, signature_data || 'I agree', id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Policy acknowledgement not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error acknowledging policy:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge policy' });
  }
});

// ============================================================================
// ESS - MY ONBOARDING
// ============================================================================

// GET /api/onboarding-checklist/my-checklist - Employee's own onboarding checklist
router.get('/my-checklist', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found' });
    }

    const result = await pool.query(`
      SELECT oc.*, c.trading_name as company_name
      FROM onboarding_checklists oc
      JOIN companies c ON oc.company_id = c.id
      WHERE oc.employee_id = $1 AND oc.tenant_id = $2
      ORDER BY oc.created_at DESC
      LIMIT 1
    `, [employeeId, tenantId]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No onboarding checklist found' });
    }

    const checklist = result.rows[0];
    const items = checklist.items || [];
    checklist.progress = items.length > 0 ? Math.round((items.filter(i => i.completed).length / items.length) * 100) : 0;

    res.json({ success: true, data: checklist });
  } catch (error) {
    console.error('Error fetching my checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your checklist' });
  }
});

// GET /api/onboarding-checklist/my-policies - Employee's pending policy acknowledgements
router.get('/my-policies', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found' });
    }

    const result = await pool.query(`
      SELECT
        pa.*,
        p.title as policy_name,
        p.document_type as policy_type,
        p.description as policy_description,
        p.effective_date
      FROM policy_acknowledgements pa
      LEFT JOIN policies p ON pa.policy_id = p.id
      WHERE pa.employee_id = $1 AND pa.tenant_id = $2
      ORDER BY pa.status ASC, pa.created_at DESC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my policies:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your policy acknowledgements' });
  }
});

// POST /api/onboarding-checklist/my-checklist/:itemIndex/complete - Employee completes own checklist item
router.post('/my-checklist/:itemIndex/complete', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;
    const userId = req.user.id;
    const { itemIndex } = req.params;
    const { notes } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found' });
    }

    // Get employee's checklist
    const checklistResult = await pool.query(`
      SELECT * FROM onboarding_checklists
      WHERE employee_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC LIMIT 1
    `, [employeeId, tenantId]);

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist not found' });
    }

    const checklist = checklistResult.rows[0];
    const items = checklist.items || [];
    const idx = parseInt(itemIndex);

    if (idx < 0 || idx >= items.length) {
      return res.status(400).json({ success: false, error: 'Invalid item index' });
    }

    // Update the item
    items[idx] = {
      ...items[idx],
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: userId,
      notes: notes || items[idx].notes
    };

    // Check completion status
    const allCompleted = items.every(item => item.completed || !item.required);

    const result = await pool.query(`
      UPDATE onboarding_checklists
      SET items = $1,
          status = CASE WHEN $2 THEN 'completed' ELSE 'in_progress' END,
          started_at = COALESCE(started_at, NOW()),
          completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
          completed_by = CASE WHEN $2 THEN $3 ELSE NULL END,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(items), allCompleted, userId, checklist.id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error completing checklist item:', error);
    res.status(500).json({ success: false, error: 'Failed to complete checklist item' });
  }
});

// ============================================================================
// DEFAULT CHECKLIST TEMPLATE
// ============================================================================

// GET /api/onboarding-checklist/default-items - Get default checklist items
router.get('/default-items', async (req, res) => {
  res.json({ success: true, data: DEFAULT_CHECKLIST_ITEMS });
});

module.exports = router;
