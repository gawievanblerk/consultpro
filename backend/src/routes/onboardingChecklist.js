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

// ============================================================================
// ESS - BFI PHASED ONBOARDING (Extended)
// ============================================================================

const onboardingService = require('../services/onboardingService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for document uploads
const uploadDir = path.join(__dirname, '../../uploads/onboarding');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, images, and Word documents are allowed'));
  }
});

/**
 * GET /api/onboarding-checklist/my-onboarding
 * Employee's full phased onboarding status (ESS)
 */
router.get('/my-onboarding', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Get employee ID from user
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Get onboarding progress using service
    const progress = await onboardingService.getOnboardingProgress(tenantId, employeeId);

    if (!progress) {
      return res.json({
        success: true,
        data: null,
        message: 'No onboarding workflow found. Contact HR to initialize your onboarding.'
      });
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching my onboarding:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding status' });
  }
});

/**
 * GET /api/onboarding-checklist/my-documents
 * Employee's required onboarding documents (ESS)
 */
router.get('/my-documents', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { phase } = req.query;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    let query = `
      SELECT
        od.*,
        p.name as policy_name,
        p.description as policy_description,
        p.file_url as policy_url,
        dt.template_content,
        dt.template_type
      FROM onboarding_documents od
      LEFT JOIN policies p ON od.policy_id = p.id
      LEFT JOIN document_templates dt ON od.template_id = dt.id
      WHERE od.employee_id = $1 AND od.tenant_id = $2
    `;
    const params = [employeeId, tenantId];

    if (phase) {
      query += ` AND od.phase = $3`;
      params.push(parseInt(phase));
    }

    query += ' ORDER BY od.phase, od.is_required DESC, od.document_name';

    const result = await pool.query(query, params);

    // Group by phase
    const documentsByPhase = {};
    for (const doc of result.rows) {
      const phaseKey = `phase${doc.phase}`;
      if (!documentsByPhase[phaseKey]) {
        documentsByPhase[phaseKey] = [];
      }
      documentsByPhase[phaseKey].push(doc);
    }

    res.json({
      success: true,
      data: {
        all: result.rows,
        byPhase: documentsByPhase
      }
    });
  } catch (error) {
    console.error('Error fetching my documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/onboarding-checklist/my-documents/:docId/upload
 * Employee uploads a document (ESS)
 */
router.post('/my-documents/:docId/upload', upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { docId } = req.params;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Verify document belongs to employee
    const docResult = await pool.query(
      'SELECT * FROM onboarding_documents WHERE id = $1 AND employee_id = $2',
      [docId, employeeId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Update document record
    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = 'uploaded',
          file_path = $1,
          file_name = $2,
          file_size = $3,
          mime_type = $4,
          uploaded_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      req.file.path,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      docId
    ]);

    // Update phase status
    const doc = docResult.rows[0];
    await onboardingService.updatePhaseStatus(tenantId, employeeId, doc.phase);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

/**
 * POST /api/onboarding-checklist/my-documents/:docId/sign
 * Employee signs a document (ESS)
 */
router.post('/my-documents/:docId/sign', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { docId } = req.params;
    const { signature_data } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!signature_data) {
      return res.status(400).json({ success: false, error: 'Signature is required' });
    }

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Verify document belongs to employee and requires signature
    const docResult = await pool.query(
      'SELECT * FROM onboarding_documents WHERE id = $1 AND employee_id = $2',
      [docId, employeeId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    if (!doc.requires_signature && !doc.requires_acknowledgment) {
      return res.status(400).json({ success: false, error: 'This document does not require signing' });
    }

    const newStatus = doc.requires_signature ? 'signed' : 'acknowledged';

    // Update document record
    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = $1,
          signature_data = $2,
          acknowledged_at = NOW(),
          ip_address = $3,
          user_agent = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [newStatus, signature_data, ipAddress, userAgent, docId]);

    // Update phase status
    await onboardingService.updatePhaseStatus(tenantId, employeeId, doc.phase);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ success: false, error: 'Failed to sign document' });
  }
});

/**
 * POST /api/onboarding-checklist/my-documents/:docId/acknowledge
 * Employee acknowledges a document (ESS)
 */
router.post('/my-documents/:docId/acknowledge', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { docId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Verify document belongs to employee
    const docResult = await pool.query(
      'SELECT * FROM onboarding_documents WHERE id = $1 AND employee_id = $2',
      [docId, employeeId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Update document record
    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = 'acknowledged',
          acknowledged_at = NOW(),
          ip_address = $1,
          user_agent = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [ipAddress, userAgent, docId]);

    // Update phase status
    await onboardingService.updatePhaseStatus(tenantId, employeeId, doc.phase);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error acknowledging document:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge document' });
  }
});

/**
 * GET /api/onboarding-checklist/my-profile-completion
 * Employee's profile completion percentage (ESS)
 */
router.get('/my-profile-completion', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Calculate profile completion
    const percentage = await onboardingService.calculateProfileCompletion(employeeId);

    // Get field-level completion details
    const fieldsResult = await pool.query(`
      SELECT
        first_name, last_name, email, phone,
        date_of_birth, gender, marital_status,
        address, city, state, country,
        national_id, tax_id,
        bank_name, bank_account_number, bank_account_name,
        emergency_contact_name, emergency_contact_phone,
        job_title, department
      FROM employees WHERE id = $1
    `, [employeeId]);

    const employee = fieldsResult.rows[0];

    const fieldStatus = {
      personal: {
        first_name: !!employee.first_name,
        last_name: !!employee.last_name,
        email: !!employee.email,
        phone: !!employee.phone,
        date_of_birth: !!employee.date_of_birth,
        gender: !!employee.gender,
        marital_status: !!employee.marital_status,
        national_id: !!employee.national_id
      },
      address: {
        address: !!employee.address,
        city: !!employee.city,
        state: !!employee.state,
        country: !!employee.country
      },
      banking: {
        bank_name: !!employee.bank_name,
        bank_account_number: !!employee.bank_account_number,
        bank_account_name: !!employee.bank_account_name
      },
      emergency: {
        emergency_contact_name: !!employee.emergency_contact_name,
        emergency_contact_phone: !!employee.emergency_contact_phone
      },
      employment: {
        job_title: !!employee.job_title,
        department: !!employee.department,
        tax_id: !!employee.tax_id
      }
    };

    res.json({
      success: true,
      data: {
        percentage,
        sections: fieldStatus,
        minimumRequired: 80,
        meetsMinimum: percentage >= 80
      }
    });
  } catch (error) {
    console.error('Error fetching profile completion:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile completion' });
  }
});

/**
 * GET /api/onboarding-checklist/my-document/:docId/content
 * Get document content/template for viewing (ESS)
 */
router.get('/my-document/:docId/content', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { docId } = req.params;

    // Get employee ID
    const employeeResult = await pool.query(`
      SELECT e.* FROM employees e
      WHERE e.user_id = $1 AND e.tenant_id = $2
    `, [userId, tenantId]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employee = employeeResult.rows[0];

    // Get document with template
    const docResult = await pool.query(`
      SELECT od.*, dt.template_content, dt.template_type,
             p.name as policy_name, p.description as policy_description, p.file_url as policy_url
      FROM onboarding_documents od
      LEFT JOIN document_templates dt ON od.template_id = dt.id
      LEFT JOIN policies p ON od.policy_id = p.id
      WHERE od.id = $1 AND od.employee_id = $2
    `, [docId, employee.id]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // If it's a policy, return policy details
    if (doc.policy_id) {
      return res.json({
        success: true,
        data: {
          type: 'policy',
          name: doc.policy_name,
          description: doc.policy_description,
          url: doc.policy_url,
          status: doc.status
        }
      });
    }

    // If it has a template, process placeholders
    let content = doc.template_content || '';
    if (content) {
      const placeholders = {
        '{{employee_name}}': `${employee.first_name} ${employee.last_name}`,
        '{{employee_email}}': employee.email,
        '{{employee_number}}': employee.employee_number,
        '{{job_title}}': employee.job_title || '',
        '{{department}}': employee.department || '',
        '{{hire_date}}': employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '',
        '{{date}}': new Date().toLocaleDateString()
      };

      for (const [key, value] of Object.entries(placeholders)) {
        content = content.replace(new RegExp(key, 'g'), value);
      }
    }

    res.json({
      success: true,
      data: {
        type: doc.template_type || 'document',
        name: doc.document_name,
        content,
        status: doc.status,
        requiresSignature: doc.requires_signature,
        requiresAcknowledgment: doc.requires_acknowledgment
      }
    });
  } catch (error) {
    console.error('Error fetching document content:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document content' });
  }
});

module.exports = router;
