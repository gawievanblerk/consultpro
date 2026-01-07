const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../utils/db');
const authenticateToken = require('../middleware/auth');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/onboarding';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// WORKFLOW TEMPLATES
// ============================================================================

/**
 * GET /api/onboarding-workflow/workflows
 * List onboarding workflow templates
 */
router.get('/workflows', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { company_id, active_only } = req.query;

    let query = `
      SELECT w.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM onboarding_workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.tenant_id = $1 AND w.deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND (w.company_id = $${paramIdx++} OR w.company_id IS NULL)`;
      params.push(company_id);
    }

    if (active_only === 'true') {
      query += ' AND w.is_active = true';
    }

    query += ' ORDER BY w.is_default DESC, w.name ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/onboarding-workflow/workflows/:id
 * Get single workflow template
 */
router.get('/workflows/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT w.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM onboarding_workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.id = $1 AND w.tenant_id = $2 AND w.deleted_at IS NULL
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/onboarding-workflow/workflows
 * Create workflow template
 */
router.post('/workflows', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { name, description, company_id, phase_config, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Workflow name is required' });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query(`
        UPDATE onboarding_workflows
        SET is_default = false, updated_at = NOW()
        WHERE tenant_id = $1 AND (company_id = $2 OR ($2 IS NULL AND company_id IS NULL))
      `, [tenantId, company_id || null]);
    }

    const result = await pool.query(`
      INSERT INTO onboarding_workflows (tenant_id, company_id, name, description, phase_config, is_default, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenantId, company_id || null, name, description, phase_config || {}, is_default || false, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ success: false, error: 'Failed to create workflow' });
  }
});

/**
 * PUT /api/onboarding-workflow/workflows/:id
 * Update workflow template
 */
router.put('/workflows/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const { name, description, phase_config, is_default, is_active } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      const existing = await pool.query(
        'SELECT company_id FROM onboarding_workflows WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (existing.rows.length > 0) {
        const companyId = existing.rows[0].company_id;
        await pool.query(`
          UPDATE onboarding_workflows
          SET is_default = false, updated_at = NOW()
          WHERE tenant_id = $1 AND id != $2 AND (company_id = $3 OR ($3 IS NULL AND company_id IS NULL))
        `, [tenantId, id, companyId]);
      }
    }

    const result = await pool.query(`
      UPDATE onboarding_workflows
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          phase_config = COALESCE($5, phase_config),
          is_default = COALESCE($6, is_default),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [id, tenantId, name, description, phase_config, is_default, is_active]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ success: false, error: 'Failed to update workflow' });
  }
});

// ============================================================================
// EMPLOYEE ONBOARDING MANAGEMENT
// ============================================================================

/**
 * GET /api/onboarding-workflow/employees
 * List employees in onboarding with their progress
 */
router.get('/employees', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { company_id, status, phase } = req.query;

    console.log('[Employees] tenantId:', tenantId, 'company_id:', company_id, 'user:', req.user?.email);

    let query;
    let params;
    let paramIdx;

    if (company_id) {
      // Use company_id as primary filter when provided
      query = `
        SELECT
          eo.*,
          e.first_name, e.last_name, e.email, e.employee_number,
          e.job_title, e.department, e.hire_date, e.employment_status,
          e.profile_completion_percentage,
          c.legal_name as company_name,
          w.name as workflow_name,
          (SELECT COUNT(*) FROM onboarding_documents od WHERE od.onboarding_id = eo.id) as total_documents,
          (SELECT COUNT(*) FROM onboarding_documents od WHERE od.onboarding_id = eo.id AND od.status IN ('signed', 'acknowledged', 'verified')) as completed_documents
        FROM employee_onboarding eo
        JOIN employees e ON eo.employee_id = e.id
        JOIN companies c ON eo.company_id = c.id
        LEFT JOIN onboarding_workflows w ON eo.workflow_id = w.id
        WHERE eo.company_id = $1
      `;
      params = [company_id];
      paramIdx = 2;
    } else {
      // Fallback to tenant_id filter
      query = `
        SELECT
          eo.*,
          e.first_name, e.last_name, e.email, e.employee_number,
          e.job_title, e.department, e.hire_date, e.employment_status,
          e.profile_completion_percentage,
          c.legal_name as company_name,
          w.name as workflow_name,
          (SELECT COUNT(*) FROM onboarding_documents od WHERE od.onboarding_id = eo.id) as total_documents,
          (SELECT COUNT(*) FROM onboarding_documents od WHERE od.onboarding_id = eo.id AND od.status IN ('signed', 'acknowledged', 'verified')) as completed_documents
        FROM employee_onboarding eo
        JOIN employees e ON eo.employee_id = e.id
        JOIN companies c ON eo.company_id = c.id
        LEFT JOIN onboarding_workflows w ON eo.workflow_id = w.id
        WHERE eo.tenant_id = $1
      `;
      params = [tenantId];
      paramIdx = 2;
    }

    if (status) {
      query += ` AND eo.overall_status = $${paramIdx++}`;
      params.push(status);
    }

    if (phase) {
      query += ` AND eo.current_phase = $${paramIdx++}`;
      params.push(parseInt(phase));
    }

    query += ' ORDER BY eo.created_at DESC';

    console.log('[Employees] Query params:', params);
    const result = await pool.query(query, params);
    console.log('[Employees] Found', result.rows.length, 'employees in onboarding');

    // Calculate progress percentage
    const employees = result.rows.map(row => ({
      ...row,
      progress: row.total_documents > 0
        ? Math.round((row.completed_documents / row.total_documents) * 100)
        : 0
    }));

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching onboarding employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

/**
 * GET /api/onboarding-workflow/new-hires
 * List employees who need onboarding (no onboarding record yet or preboarding status)
 */
router.get('/new-hires', async (req, res) => {
  try {
    const { company_id } = req.query;

    console.log('[New Hires] company_id:', company_id, 'user:', req.user?.email);

    // If company_id provided, filter by it; otherwise get all for the user
    let query;
    let params;

    if (company_id) {
      // Direct company filter - most common case
      query = `
        SELECT
          e.id, e.id as employee_id,
          e.first_name, e.last_name, e.email, e.employee_number,
          e.job_title, e.department, e.hire_date, e.employment_status,
          c.legal_name as company_name,
          c.id as company_id,
          eo.id as onboarding_id
        FROM employees e
        JOIN companies c ON e.company_id = c.id
        LEFT JOIN employee_onboarding eo ON e.id = eo.employee_id
        WHERE e.company_id = $1
          AND e.deleted_at IS NULL
        ORDER BY e.hire_date DESC NULLS LAST, e.created_at DESC
      `;
      params = [company_id];
    } else {
      // No company filter - return empty (require company selection)
      console.log('[New Hires] No company_id provided, returning empty');
      return res.json({ success: true, data: [] });
    }

    const allResult = await pool.query(query, params);
    console.log('[New Hires] Total employees found:', allResult.rows.length);
    allResult.rows.forEach(r => {
      console.log(`  - ${r.first_name} ${r.last_name}: onboarding_id=${r.onboarding_id}, status=${r.employment_status}`);
    });

    // Filter for new hires (no onboarding record yet)
    const newHires = allResult.rows.filter(e => !e.onboarding_id);
    console.log('[New Hires] Filtered new hires (no onboarding):', newHires.length);

    res.json({ success: true, data: newHires });
  } catch (error) {
    console.error('Error fetching new hires:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch new hires' });
  }
});

/**
 * GET /api/onboarding-workflow/employees/:employeeId
 * Get detailed onboarding status for an employee
 */
router.get('/employees/:employeeId', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { employeeId } = req.params;

    // Get onboarding record
    const onboardingResult = await pool.query(`
      SELECT
        eo.*,
        e.first_name, e.last_name, e.email, e.employee_number,
        e.job_title, e.department, e.hire_date, e.employment_status,
        e.profile_completion_percentage,
        c.legal_name as company_name,
        w.name as workflow_name,
        w.phase_config
      FROM employee_onboarding eo
      JOIN employees e ON eo.employee_id = e.id
      JOIN companies c ON eo.company_id = c.id
      LEFT JOIN onboarding_workflows w ON eo.workflow_id = w.id
      WHERE eo.employee_id = $1 AND eo.tenant_id = $2
    `, [employeeId, tenantId]);

    if (onboardingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Onboarding record not found' });
    }

    const onboarding = onboardingResult.rows[0];

    // Get all documents for this onboarding
    const documentsResult = await pool.query(`
      SELECT *
      FROM onboarding_documents
      WHERE onboarding_id = $1
      ORDER BY phase, sort_order, document_type
    `, [onboarding.id]);

    // Group documents by phase
    const documentsByPhase = {};
    documentsResult.rows.forEach(doc => {
      if (!documentsByPhase[doc.phase]) {
        documentsByPhase[doc.phase] = [];
      }
      documentsByPhase[doc.phase].push(doc);
    });

    res.json({
      success: true,
      data: {
        ...onboarding,
        documents: documentsResult.rows,
        documentsByPhase
      }
    });
  } catch (error) {
    console.error('Error fetching employee onboarding:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding status' });
  }
});

/**
 * GET /api/onboarding-workflow/employees/:employeeId/status
 * Alias for getting employee onboarding status (same as /:employeeId)
 */
router.get('/employees/:employeeId/status', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Get onboarding record - filter by employee_id and company
    const onboardingResult = await pool.query(`
      SELECT
        eo.*,
        e.first_name, e.last_name, e.email, e.employee_number,
        e.job_title, e.department, e.hire_date, e.employment_status,
        e.profile_completion_percentage,
        c.legal_name as company_name,
        w.name as workflow_name,
        w.phase_config
      FROM employee_onboarding eo
      JOIN employees e ON eo.employee_id = e.id
      JOIN companies c ON eo.company_id = c.id
      LEFT JOIN onboarding_workflows w ON eo.workflow_id = w.id
      WHERE eo.employee_id = $1
    `, [employeeId]);

    if (onboardingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Onboarding record not found' });
    }

    const onboarding = onboardingResult.rows[0];

    // Get all documents for this onboarding
    const documentsResult = await pool.query(`
      SELECT *
      FROM onboarding_documents
      WHERE onboarding_id = $1
      ORDER BY phase, sort_order, document_type
    `, [onboarding.id]);

    // Group documents by phase
    const documentsByPhase = {};
    documentsResult.rows.forEach(doc => {
      if (!documentsByPhase[doc.phase]) {
        documentsByPhase[doc.phase] = [];
      }
      documentsByPhase[doc.phase].push(doc);
    });

    res.json({
      success: true,
      data: {
        ...onboarding,
        documents: documentsResult.rows,
        documentsByPhase
      }
    });
  } catch (error) {
    console.error('Error fetching employee onboarding status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding status' });
  }
});

/**
 * POST /api/onboarding-workflow/employees/:employeeId/start
 * Start onboarding for an employee
 */
router.post('/employees/:employeeId/start', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user?.id;
    const { employeeId } = req.params;
    const { workflow_id } = req.body;

    console.log('[Start Onboarding] employeeId:', employeeId, 'tenantId:', tenantId);

    await client.query('BEGIN');

    // Get employee details (employees don't have tenant_id, use company->consultant->tenant)
    const employeeResult = await client.query(`
      SELECT e.*, c.id as company_id, co.tenant_id
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      JOIN consultants co ON c.consultant_id = co.id
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [employeeId]);

    if (employeeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];
    // Use tenant_id from the employee's consultant
    const effectiveTenantId = employee.tenant_id || tenantId;
    console.log('[Start Onboarding] Using tenant_id:', effectiveTenantId);

    // Check if onboarding already exists
    const existingResult = await client.query(
      'SELECT id FROM employee_onboarding WHERE employee_id = $1',
      [employeeId]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('[Start Onboarding] Already exists for employee:', employeeId, 'onboarding_id:', existingResult.rows[0].id);
      return res.status(400).json({
        success: false,
        error: 'Onboarding already started for this employee',
        onboarding_id: existingResult.rows[0].id
      });
    }

    // Get workflow (use specified or default)
    let workflowQuery = `
      SELECT * FROM onboarding_workflows
      WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true
    `;
    const workflowParams = [effectiveTenantId];

    if (workflow_id) {
      workflowQuery += ' AND id = $2';
      workflowParams.push(workflow_id);
    } else {
      workflowQuery += ` AND (company_id = $2 OR company_id IS NULL) AND is_default = true`;
      workflowParams.push(employee.company_id);
    }

    workflowQuery += ' LIMIT 1';

    const workflowResult = await client.query(workflowQuery, workflowParams);

    // Use workflow from DB or default config
    let workflow = workflowResult.rows[0];
    let phaseConfig;

    if (!workflow) {
      console.log('[Start Onboarding] No workflow found, using default config');
      // Default phase configuration
      phaseConfig = {
        phase1: {
          name: 'Document Signing',
          due_days: 3,
          hard_gate: true,
          documents: [
            { type: 'offer_letter', title: 'Offer Letter', requires_signature: true },
            { type: 'employment_contract', title: 'Employment Contract', requires_signature: true },
            { type: 'nda', title: 'Non-Disclosure Agreement', requires_signature: true },
            { type: 'code_of_conduct', title: 'Code of Conduct', requires_acknowledgment: true }
          ]
        },
        phase2: {
          name: 'Role Clarity',
          due_days: 5,
          hard_gate: false,
          documents: [
            { type: 'job_description', title: 'Job Description', requires_acknowledgment: true },
            { type: 'org_chart', title: 'Organization Chart', requires_acknowledgment: true }
          ]
        },
        phase3: {
          name: 'Employee File',
          due_days: 7,
          hard_gate: true,
          documents: [
            { type: 'passport_photo', title: 'Passport Photograph', requires_upload: true },
            { type: 'government_id', title: 'Government ID', requires_upload: true },
            { type: 'educational_cert', title: 'Educational Certificates', requires_upload: true },
            { type: 'bank_details', title: 'Bank Account Details', requires_upload: true }
          ]
        },
        phase4: {
          name: 'Policy Acknowledgments',
          due_days: 10,
          hard_gate: false,
          documents: []
        },
        phase5: {
          name: 'Complete',
          due_days: 14,
          hard_gate: false,
          documents: []
        }
      };
      workflow = { id: null };
    } else {
      phaseConfig = workflow.phase_config;
    }

    // Create onboarding record
    const onboardingResult = await client.query(`
      INSERT INTO employee_onboarding (
        tenant_id, company_id, employee_id, workflow_id,
        current_phase, overall_status, started_at
      ) VALUES ($1, $2, $3, $4, 1, 'in_progress', NOW())
      RETURNING *
    `, [effectiveTenantId, employee.company_id, employeeId, workflow.id]);

    const onboarding = onboardingResult.rows[0];

    // Create document requirements based on workflow phases
    const documentsToCreate = [];
    const hireDate = employee.hire_date || new Date();

    for (const [phaseKey, config] of Object.entries(phaseConfig)) {
      const phaseNum = parseInt(phaseKey.replace('phase', ''));
      const dueDays = config.due_days || 7;
      const dueDate = new Date(hireDate);
      dueDate.setDate(dueDate.getDate() + dueDays);

      if (config.documents) {
        for (const [idx, doc] of config.documents.entries()) {
          documentsToCreate.push({
            phase: phaseNum,
            document_type: doc.type,
            document_title: doc.title,
            document_category: phaseNum === 1 ? 'phase1_signing' : (phaseNum === 2 ? 'phase2_acknowledgment' : 'phase3_employee_file'),
            requires_signature: doc.requires_signature || false,
            requires_acknowledgment: doc.requires_acknowledgment || false,
            requires_upload: doc.requires_upload || false,
            is_required: doc.is_required !== false,
            sort_order: idx,
            due_date: dueDate
          });
        }
      }
    }

    // Insert documents
    for (const doc of documentsToCreate) {
      await client.query(`
        INSERT INTO onboarding_documents (
          tenant_id, company_id, employee_id, onboarding_id,
          document_type, document_title, document_category, phase, sort_order,
          requires_signature, requires_acknowledgment, requires_upload, is_required,
          due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        effectiveTenantId, employee.company_id, employeeId, onboarding.id,
        doc.document_type, doc.document_title, doc.document_category, doc.phase, doc.sort_order,
        doc.requires_signature, doc.requires_acknowledgment, doc.requires_upload, doc.is_required,
        doc.due_date
      ]);
    }

    // Update employee status to preboarding
    await client.query(`
      UPDATE employees SET employment_status = 'preboarding', updated_at = NOW()
      WHERE id = $1
    `, [employeeId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Onboarding started successfully',
      data: onboarding
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error starting onboarding:', error);
    res.status(500).json({ success: false, error: `Failed to start onboarding: ${error.message}` });
  } finally {
    client.release();
  }
});

/**
 * POST /api/onboarding-workflow/employees/:employeeId/activate
 * Transition employee to Active status (with hard gate checks)
 */
router.post('/employees/:employeeId/activate', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { employeeId } = req.params;

    await client.query('BEGIN');

    // Get onboarding record
    const onboardingResult = await client.query(`
      SELECT eo.*, w.phase_config
      FROM employee_onboarding eo
      LEFT JOIN onboarding_workflows w ON eo.workflow_id = w.id
      WHERE eo.employee_id = $1 AND eo.tenant_id = $2
    `, [employeeId, tenantId]);

    if (onboardingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Onboarding record not found' });
    }

    const onboarding = onboardingResult.rows[0];
    const phaseConfig = onboarding.phase_config || {};

    // Check hard gates
    const blockers = [];

    // Gate 1: Phase 1 completion (required documents signed/acknowledged)
    const phase1Config = phaseConfig.phase1;
    if (phase1Config?.hard_gate) {
      const phase1DocsResult = await client.query(`
        SELECT * FROM onboarding_documents
        WHERE onboarding_id = $1 AND phase = 1 AND is_required = true
      `, [onboarding.id]);

      const incompleteDocs = phase1DocsResult.rows.filter(doc => {
        if (doc.requires_signature && doc.status !== 'signed') return true;
        if (doc.requires_acknowledgment && !['acknowledged', 'signed'].includes(doc.status)) return true;
        return false;
      });

      if (incompleteDocs.length > 0) {
        blockers.push({
          phase: 1,
          message: `${incompleteDocs.length} required document(s) not completed in Phase 1`,
          documents: incompleteDocs.map(d => d.document_title)
        });
      }
    }

    // Gate 2: Phase 3 completion (employee file complete)
    const phase3Config = phaseConfig.phase3;
    if (phase3Config?.hard_gate) {
      // Check uploads are verified
      const phase3DocsResult = await client.query(`
        SELECT * FROM onboarding_documents
        WHERE onboarding_id = $1 AND phase = 3 AND is_required = true AND requires_upload = true
      `, [onboarding.id]);

      const unverifiedDocs = phase3DocsResult.rows.filter(doc => doc.status !== 'verified');

      if (unverifiedDocs.length > 0) {
        blockers.push({
          phase: 3,
          message: `${unverifiedDocs.length} document upload(s) not verified in Phase 3`,
          documents: unverifiedDocs.map(d => d.document_title)
        });
      }

      // Check employee file marked complete
      if (!onboarding.employee_file_complete) {
        blockers.push({
          phase: 3,
          message: 'Employee file not marked as complete by HR'
        });
      }
    }

    if (blockers.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot activate employee - hard gates not passed',
        blockers
      });
    }

    // All gates passed - activate employee
    await client.query(`
      UPDATE employees
      SET employment_status = 'active',
          onboarding_completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [employeeId]);

    // Update onboarding record
    await client.query(`
      UPDATE employee_onboarding
      SET overall_status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [onboarding.id]);

    // Auto-schedule probation check-ins if configured
    const phase5Config = phaseConfig.phase5;
    if (phase5Config?.create_checkins) {
      const checkinDays = phase5Config.checkin_days || [30, 60, 90];
      const employee = await client.query(
        'SELECT hire_date, reports_to, company_id FROM employees WHERE id = $1',
        [employeeId]
      );
      const emp = employee.rows[0];
      const hireDate = emp.hire_date || new Date();

      for (const days of checkinDays) {
        const scheduledDate = new Date(hireDate);
        scheduledDate.setDate(scheduledDate.getDate() + days);

        await client.query(`
          INSERT INTO probation_checkin_tasks (
            tenant_id, company_id, employee_id,
            checkin_type, checkin_day, checkin_name,
            scheduled_date, manager_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          tenantId,
          emp.company_id,
          employeeId,
          `${days}_day`,
          days,
          `${days}-Day Probation Check-in`,
          scheduledDate,
          emp.reports_to
        ]);
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Employee activated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error activating employee:', error);
    res.status(500).json({ success: false, error: 'Failed to activate employee' });
  } finally {
    client.release();
  }
});

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

/**
 * GET /api/onboarding-workflow/employees/:employeeId/documents
 * List all documents for employee onboarding
 */
router.get('/employees/:employeeId/documents', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { employeeId } = req.params;
    const { phase, status } = req.query;

    let query = `
      SELECT od.*, u.first_name || ' ' || u.last_name as verified_by_name
      FROM onboarding_documents od
      LEFT JOIN users u ON od.verified_by = u.id
      WHERE od.employee_id = $1 AND od.tenant_id = $2
    `;
    const params = [employeeId, tenantId];
    let paramIdx = 3;

    if (phase) {
      query += ` AND od.phase = $${paramIdx++}`;
      params.push(parseInt(phase));
    }

    if (status) {
      query += ` AND od.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY od.phase, od.sort_order, od.document_type';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/onboarding-workflow/employees/:employeeId/documents/:docId/upload
 * Upload a document
 */
router.post('/employees/:employeeId/documents/:docId/upload', upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { employeeId, docId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Verify document belongs to employee
    const docResult = await pool.query(`
      SELECT * FROM onboarding_documents
      WHERE id = $1 AND employee_id = $2 AND tenant_id = $3
    `, [docId, employeeId, tenantId]);

    if (docResult.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Check if overdue
    const wasOverdue = doc.due_date && new Date() > new Date(doc.due_date);

    const result = await pool.query(`
      UPDATE onboarding_documents
      SET file_path = $1,
          file_name = $2,
          file_size = $3,
          mime_type = $4,
          status = 'uploaded',
          was_overdue = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      req.file.path,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      wasOverdue,
      docId
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

/**
 * POST /api/onboarding-workflow/employees/:employeeId/documents/:docId/sign
 * Sign or acknowledge a document
 */
router.post('/employees/:employeeId/documents/:docId/sign', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { employeeId, docId } = req.params;
    const { signature_data, acknowledgment } = req.body;

    // Verify document belongs to employee
    const docResult = await pool.query(`
      SELECT * FROM onboarding_documents
      WHERE id = $1 AND employee_id = $2 AND tenant_id = $3
    `, [docId, employeeId, tenantId]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Determine new status and action
    let newStatus = 'acknowledged';
    let updateFields = {
      acknowledged_at: 'NOW()',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    };

    if (doc.requires_signature) {
      if (!signature_data) {
        return res.status(400).json({ success: false, error: 'Signature is required' });
      }
      newStatus = 'signed';
      updateFields.signature_data = signature_data;
      updateFields.signed_at = 'NOW()';
    }

    // Check if overdue
    const wasOverdue = doc.due_date && new Date() > new Date(doc.due_date);

    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = $1,
          signature_data = COALESCE($2, signature_data),
          acknowledged_at = NOW(),
          signed_at = CASE WHEN $1 = 'signed' THEN NOW() ELSE signed_at END,
          ip_address = $3,
          user_agent = $4,
          was_overdue = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      newStatus,
      signature_data,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent'],
      wasOverdue,
      docId
    ]);

    // Check if phase is complete and update onboarding status
    await updatePhaseStatus(employeeId, doc.phase);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ success: false, error: 'Failed to sign document' });
  }
});

/**
 * PUT /api/onboarding-workflow/employees/:employeeId/documents/:docId/verify
 * HR verifies an uploaded document
 */
router.put('/employees/:employeeId/documents/:docId/verify', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { employeeId, docId } = req.params;

    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = 'verified',
          verified_by = $1,
          verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND employee_id = $3 AND tenant_id = $4 AND status = 'uploaded'
      RETURNING *
    `, [userId, docId, employeeId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found or not in uploaded status' });
    }

    // Check if phase is complete
    await updatePhaseStatus(employeeId, result.rows[0].phase);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ success: false, error: 'Failed to verify document' });
  }
});

/**
 * PUT /api/onboarding-workflow/employees/:employeeId/documents/:docId/reject
 * HR rejects an uploaded document
 */
router.put('/employees/:employeeId/documents/:docId/reject', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { employeeId, docId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    const result = await pool.query(`
      UPDATE onboarding_documents
      SET status = 'rejected',
          verified_by = $1,
          verified_at = NOW(),
          rejection_reason = $2,
          updated_at = NOW()
      WHERE id = $3 AND employee_id = $4 AND tenant_id = $5 AND status = 'uploaded'
      RETURNING *
    `, [userId, reason, docId, employeeId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found or not in uploaded status' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ success: false, error: 'Failed to reject document' });
  }
});

/**
 * PUT /api/onboarding-workflow/employees/:employeeId/file-complete
 * HR marks employee file as complete
 */
router.put('/employees/:employeeId/file-complete', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { employeeId } = req.params;

    const result = await pool.query(`
      UPDATE employee_onboarding
      SET employee_file_complete = true,
          employee_file_verified_by = $1,
          employee_file_verified_at = NOW(),
          updated_at = NOW()
      WHERE employee_id = $2 AND tenant_id = $3
      RETURNING *
    `, [userId, employeeId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Onboarding record not found' });
    }

    res.json({
      success: true,
      message: 'Employee file marked as complete',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking file complete:', error);
    res.status(500).json({ success: false, error: 'Failed to mark file complete' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update phase status based on document completion
 */
async function updatePhaseStatus(employeeId, phase) {
  try {
    // Get onboarding record
    const onboardingResult = await pool.query(`
      SELECT id, phase_statuses FROM employee_onboarding WHERE employee_id = $1
    `, [employeeId]);

    if (onboardingResult.rows.length === 0) return;

    const onboarding = onboardingResult.rows[0];

    // Check if all required documents in phase are complete
    const docsResult = await pool.query(`
      SELECT * FROM onboarding_documents
      WHERE onboarding_id = $1 AND phase = $2 AND is_required = true
    `, [onboarding.id, phase]);

    const allComplete = docsResult.rows.every(doc => {
      if (doc.requires_signature) return doc.status === 'signed';
      if (doc.requires_acknowledgment) return ['acknowledged', 'signed'].includes(doc.status);
      if (doc.requires_upload) return doc.status === 'verified';
      return true;
    });

    if (allComplete) {
      // Update phase status
      const phaseStatuses = onboarding.phase_statuses || {};
      phaseStatuses[`phase${phase}`] = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        blocked: false
      };

      // Unlock next phase
      const nextPhase = phase + 1;
      if (phaseStatuses[`phase${nextPhase}`]) {
        phaseStatuses[`phase${nextPhase}`].status = 'pending';
        phaseStatuses[`phase${nextPhase}`].blocked = false;
      }

      await pool.query(`
        UPDATE employee_onboarding
        SET phase_statuses = $1,
            current_phase = CASE WHEN current_phase = $2 THEN $3 ELSE current_phase END,
            updated_at = NOW()
        WHERE id = $4
      `, [JSON.stringify(phaseStatuses), phase, nextPhase, onboarding.id]);
    }
  } catch (error) {
    console.error('Error updating phase status:', error);
  }
}

/**
 * POST /api/onboarding-workflow/employees/:employeeId/refresh-documents
 * Regenerate missing documents for an existing onboarding
 */
router.post('/employees/:employeeId/refresh-documents', async (req, res) => {
  const client = await pool.connect();
  try {
    const { employeeId } = req.params;

    // Get existing onboarding with tenant_id from onboarding record
    const onboardingResult = await client.query(`
      SELECT eo.*, e.company_id
      FROM employee_onboarding eo
      JOIN employees e ON eo.employee_id = e.id
      WHERE eo.employee_id = $1
    `, [employeeId]);

    if (onboardingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No onboarding found for this employee' });
    }

    const onboarding = onboardingResult.rows[0];
    const companyId = onboarding.company_id;
    const tenantId = onboarding.tenant_id;

    // Default phase config
    const phaseConfig = {
      phase1: {
        documents: [
          { type: 'offer_letter', label: 'Offer Letter', action: 'sign', required: true },
          { type: 'employment_contract', label: 'Employment Contract', action: 'sign', required: true },
          { type: 'nda', label: 'Non-Disclosure Agreement', action: 'sign', required: true },
          { type: 'ndpa_consent', label: 'NDPA Notice & Consent', action: 'acknowledge', required: true },
          { type: 'code_of_conduct', label: 'Code of Conduct', action: 'acknowledge', required: true }
        ],
        due_days: 2
      },
      phase2: {
        documents: [
          { type: 'job_description', label: 'Job Description', action: 'acknowledge', required: true },
          { type: 'org_chart', label: 'Organizational Chart', action: 'acknowledge', required: true },
          { type: 'key_contacts', label: 'Key Contacts & Escalation Map', action: 'acknowledge', required: false }
        ],
        due_days: 3
      },
      phase3: {
        documents: [
          { type: 'passport_photos', label: 'Passport Photographs', action: 'upload', required: true },
          { type: 'educational_certs', label: 'Educational Certificates', action: 'upload', required: true },
          { type: 'professional_certs', label: 'Professional Certifications', action: 'upload', required: false },
          { type: 'government_id', label: 'Government-Issued ID', action: 'upload', required: true },
          { type: 'bank_details', label: 'Bank Account Verification', action: 'upload', required: true }
        ],
        due_days: 5
      }
    };

    await client.query('BEGIN');

    let createdCount = 0;

    // Create documents for phases 1-3
    for (const [phaseKey, phaseData] of Object.entries(phaseConfig)) {
      if (!phaseData.documents) continue;

      const phaseNum = parseInt(phaseKey.replace('phase', ''));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (phaseData.due_days || 5));

      for (const doc of phaseData.documents) {
        // Check if document already exists
        const existingDoc = await client.query(
          'SELECT id FROM onboarding_documents WHERE employee_id = $1 AND document_type = $2',
          [employeeId, doc.type]
        );

        if (existingDoc.rows.length === 0) {
          await client.query(`
            INSERT INTO onboarding_documents (
              tenant_id, company_id, employee_id, onboarding_id,
              document_type, document_title, document_category, phase,
              requires_signature, requires_acknowledgment, requires_upload,
              is_required, status, due_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
          `, [
            tenantId,
            companyId,
            employeeId,
            onboarding.id,
            doc.type,
            doc.label,
            `phase${phaseNum}_${doc.action === 'sign' ? 'signing' : doc.action === 'acknowledge' ? 'acknowledgment' : 'employee_file'}`,
            phaseNum,
            doc.action === 'sign',
            doc.action === 'acknowledge',
            doc.action === 'upload',
            doc.required !== false,
            dueDate
          ]);
          createdCount++;
        }
      }
    }

    // Add Phase 4 policy documents
    const policies = await client.query(`
      SELECT id, title FROM policies
      WHERE tenant_id = $1 AND (company_id = $2 OR company_id IS NULL)
      AND is_active = true AND requires_acknowledgment = true
    `, [tenantId, companyId]);

    for (const policy of policies.rows) {
      const existingDoc = await client.query(
        'SELECT id FROM onboarding_documents WHERE employee_id = $1 AND policy_id = $2',
        [employeeId, policy.id]
      );

      if (existingDoc.rows.length === 0) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5);

        await client.query(`
          INSERT INTO onboarding_documents (
            tenant_id, company_id, employee_id, onboarding_id,
            document_type, document_title, document_category, phase,
            requires_acknowledgment, is_required, policy_id, status, due_date
          ) VALUES ($1, $2, $3, $4, 'policy', $5, 'phase4_acknowledgment', 4, true, true, $6, 'pending', $7)
        `, [tenantId, companyId, employeeId, onboarding.id, policy.title, policy.id, dueDate]);
        createdCount++;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Created ${createdCount} missing document(s)`,
      documentsCreated: createdCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error refreshing documents:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh documents' });
  } finally {
    client.release();
  }
});

module.exports = router;