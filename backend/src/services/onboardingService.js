/**
 * Onboarding Service
 * Business logic for BFI HRIS phased onboarding workflow
 */
const pool = require('../utils/db');

// Default phase configuration
const DEFAULT_PHASE_CONFIG = {
  phase1: {
    name: 'Document Signing',
    description: 'Essential documents requiring signature',
    due_days: 2,
    hard_gate: true,
    documents: [
      { type: 'offer_letter', label: 'Offer Letter', action: 'sign', required: true },
      { type: 'employment_contract', label: 'Employment Contract', action: 'sign', required: true },
      { type: 'nda', label: 'Non-Disclosure Agreement', action: 'sign', required: true },
      { type: 'ndpa_consent', label: 'NDPA Notice & Consent', action: 'acknowledge', required: true },
      { type: 'code_of_conduct', label: 'Code of Conduct', action: 'acknowledge', required: true }
    ]
  },
  phase2: {
    name: 'Role Clarity',
    description: 'Understanding your role and team',
    due_days: 3,
    hard_gate: false,
    documents: [
      { type: 'job_description', label: 'Job Description', action: 'acknowledge', required: true },
      { type: 'org_chart', label: 'Organizational Chart', action: 'acknowledge', required: true },
      { type: 'key_contacts', label: 'Key Contacts & Escalation Map', action: 'acknowledge', required: false }
    ]
  },
  phase3: {
    name: 'Employee File',
    description: 'Complete profile and upload documents',
    due_days: 5,
    hard_gate: true,
    documents: [
      { type: 'passport_photos', label: 'Passport Photographs', action: 'upload', required: true },
      { type: 'educational_certs', label: 'Educational Certificates', action: 'upload', required: true },
      { type: 'professional_certs', label: 'Professional Certifications', action: 'upload', required: false },
      { type: 'government_id', label: 'Government-Issued ID', action: 'upload', required: true },
      { type: 'bank_details', label: 'Bank Account Verification', action: 'upload', required: true }
    ]
  },
  phase4: {
    name: 'Policy Acknowledgments',
    description: 'Company policies and procedures',
    due_days: 5,
    hard_gate: false,
    documents: [] // Populated dynamically from policies table
  },
  phase5: {
    name: 'Probation Check-ins',
    description: 'Scheduled review milestones',
    due_days: 90,
    hard_gate: false,
    documents: []
  }
};

/**
 * Initialize onboarding for a new employee
 */
async function initializeOnboarding(tenantId, companyId, employeeId, workflowId = null, initiatedBy = null) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get or create workflow
    let workflow;
    if (workflowId) {
      const wfResult = await client.query(
        'SELECT * FROM onboarding_workflows WHERE id = $1 AND tenant_id = $2',
        [workflowId, tenantId]
      );
      workflow = wfResult.rows[0];
    } else {
      // Get default workflow
      const wfResult = await client.query(
        'SELECT * FROM onboarding_workflows WHERE tenant_id = $1 AND company_id = $2 AND is_default = true AND is_active = true',
        [tenantId, companyId]
      );
      workflow = wfResult.rows[0];

      if (!workflow) {
        // Use tenant-level default
        const tenantWfResult = await client.query(
          'SELECT * FROM onboarding_workflows WHERE tenant_id = $1 AND company_id IS NULL AND is_default = true AND is_active = true',
          [tenantId]
        );
        workflow = tenantWfResult.rows[0];
      }
    }

    const phaseConfig = workflow?.phase_config || DEFAULT_PHASE_CONFIG;

    // Create employee_onboarding record
    // Note: current_phase is INTEGER (1-5), not string
    const onboardingResult = await client.query(`
      INSERT INTO employee_onboarding (
        tenant_id, company_id, employee_id, workflow_id,
        current_phase, overall_status, phase_statuses, started_at
      ) VALUES ($1, $2, $3, $4, 1, 'in_progress', $5, NOW())
      ON CONFLICT (employee_id) DO UPDATE SET
        current_phase = 1,
        overall_status = 'in_progress',
        started_at = COALESCE(employee_onboarding.started_at, NOW())
      RETURNING *
    `, [
      tenantId,
      companyId,
      employeeId,
      workflow?.id || null,
      JSON.stringify({
        phase1: 'in_progress',
        phase2: 'pending',
        phase3: 'pending',
        phase4: 'pending',
        phase5: 'pending'
      })
    ]);

    const onboarding = onboardingResult.rows[0];

    // Create document requirements for phases 1-3
    const documents = [];

    for (const [phaseKey, phaseData] of Object.entries(phaseConfig)) {
      if (!phaseData.documents || phaseData.documents.length === 0) continue;

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
          const docResult = await client.query(`
            INSERT INTO onboarding_documents (
              tenant_id, company_id, employee_id, onboarding_id,
              document_type, document_name, document_category, phase,
              requires_signature, requires_acknowledgment, requires_upload,
              is_required, status, due_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
            RETURNING *
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
          documents.push(docResult.rows[0]);
        }
      }
    }

    // Add Phase 4 policy documents
    const policies = await client.query(`
      SELECT id, name, requires_acknowledgment FROM policies
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
            document_type, document_name, document_category, phase,
            requires_acknowledgment, is_required, policy_id, status, due_date
          ) VALUES ($1, $2, $3, $4, 'policy', $5, 'phase4_acknowledgment', 4, true, true, $6, 'pending', $7)
        `, [tenantId, companyId, employeeId, onboarding.id, policy.name, policy.id, dueDate]);
      }
    }

    // Update employee status to preboarding
    await client.query(
      "UPDATE employees SET employment_status = 'preboarding' WHERE id = $1",
      [employeeId]
    );

    await client.query('COMMIT');

    return {
      onboarding,
      documents,
      phaseConfig
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if hard gates are passed for activation
 */
async function checkHardGates(tenantId, employeeId) {
  // Get onboarding record
  const onboardingResult = await pool.query(
    'SELECT * FROM employee_onboarding WHERE employee_id = $1 AND tenant_id = $2',
    [employeeId, tenantId]
  );

  if (onboardingResult.rows.length === 0) {
    return { passed: false, errors: ['No onboarding record found'] };
  }

  const onboarding = onboardingResult.rows[0];
  const errors = [];

  // Gate 1: Phase 1 documents (all required signed/acknowledged)
  const phase1Docs = await pool.query(`
    SELECT document_type, document_name, status, is_required
    FROM onboarding_documents
    WHERE employee_id = $1 AND phase = 1 AND is_required = true
  `, [employeeId]);

  for (const doc of phase1Docs.rows) {
    if (!['signed', 'acknowledged'].includes(doc.status)) {
      errors.push(`Phase 1: ${doc.document_name} not completed (status: ${doc.status})`);
    }
  }

  // Gate 2: Phase 3 documents (all required uploaded and verified)
  const phase3Docs = await pool.query(`
    SELECT document_type, document_name, status, is_required
    FROM onboarding_documents
    WHERE employee_id = $1 AND phase = 3 AND is_required = true
  `, [employeeId]);

  for (const doc of phase3Docs.rows) {
    if (!['verified', 'uploaded'].includes(doc.status)) {
      errors.push(`Phase 3: ${doc.document_name} not completed (status: ${doc.status})`);
    }
  }

  // Gate 3: Employee file marked complete by HR
  if (!onboarding.employee_file_complete) {
    errors.push('Employee file not marked complete by HR');
  }

  // Gate 4: Profile completion (minimum 80%)
  const employeeResult = await pool.query(
    'SELECT profile_completion_percentage FROM employees WHERE id = $1',
    [employeeId]
  );

  const profileCompletion = employeeResult.rows[0]?.profile_completion_percentage || 0;
  if (profileCompletion < 80) {
    errors.push(`Profile completion at ${profileCompletion}% (minimum 80% required)`);
  }

  return {
    passed: errors.length === 0,
    errors,
    onboarding
  };
}

/**
 * Calculate profile completion percentage
 */
async function calculateProfileCompletion(employeeId) {
  const result = await pool.query(`
    SELECT
      first_name, last_name, email, phone,
      date_of_birth, gender, marital_status,
      address, city, state, country,
      national_id, tax_id,
      bank_name, bank_account_number, bank_account_name,
      emergency_contact_name, emergency_contact_phone,
      job_title, department, reports_to, hire_date
    FROM employees WHERE id = $1
  `, [employeeId]);

  if (result.rows.length === 0) return 0;

  const employee = result.rows[0];

  // Define required fields and weights
  const fieldWeights = {
    // Personal Info (30%)
    first_name: 5, last_name: 5, email: 5,
    phone: 3, date_of_birth: 3, gender: 2,
    marital_status: 2, national_id: 5,

    // Address (15%)
    address: 5, city: 3, state: 3, country: 4,

    // Banking (20%)
    bank_name: 7, bank_account_number: 7, bank_account_name: 6,

    // Emergency Contact (15%)
    emergency_contact_name: 8, emergency_contact_phone: 7,

    // Employment (20%)
    job_title: 5, department: 5, hire_date: 5, tax_id: 5
  };

  let totalWeight = 0;
  let completedWeight = 0;

  for (const [field, weight] of Object.entries(fieldWeights)) {
    totalWeight += weight;
    if (employee[field] && String(employee[field]).trim() !== '') {
      completedWeight += weight;
    }
  }

  const percentage = Math.round((completedWeight / totalWeight) * 100);

  // Update employee record
  await pool.query(
    'UPDATE employees SET profile_completion_percentage = $1 WHERE id = $2',
    [percentage, employeeId]
  );

  return percentage;
}

/**
 * Update phase status and check for progression
 */
async function updatePhaseStatus(tenantId, employeeId, phase) {
  // Get all documents for this phase
  const docsResult = await pool.query(`
    SELECT status, is_required FROM onboarding_documents
    WHERE employee_id = $1 AND phase = $2
  `, [employeeId, phase]);

  let allComplete = true;
  for (const doc of docsResult.rows) {
    if (doc.is_required && !['signed', 'acknowledged', 'verified', 'uploaded'].includes(doc.status)) {
      allComplete = false;
      break;
    }
  }

  // Get current onboarding
  const onboardingResult = await pool.query(
    'SELECT * FROM employee_onboarding WHERE employee_id = $1',
    [employeeId]
  );

  if (onboardingResult.rows.length === 0) return null;

  const onboarding = onboardingResult.rows[0];
  const phaseStatuses = onboarding.phase_statuses || {};

  // Update phase status
  phaseStatuses[`phase${phase}`] = allComplete ? 'completed' : 'in_progress';

  // Check if we should auto-advance
  let newCurrentPhase = onboarding.current_phase;
  const currentPhaseNum = parseInt(onboarding.current_phase.replace('phase', ''));

  if (allComplete && currentPhaseNum === phase && phase < 5) {
    newCurrentPhase = `phase${phase + 1}`;
    phaseStatuses[`phase${phase + 1}`] = 'in_progress';
  }

  // Update onboarding record
  await pool.query(`
    UPDATE employee_onboarding
    SET phase_statuses = $1, current_phase = $2, updated_at = NOW()
    WHERE employee_id = $3
  `, [JSON.stringify(phaseStatuses), newCurrentPhase, employeeId]);

  return {
    phaseStatuses,
    currentPhase: newCurrentPhase,
    phaseComplete: allComplete
  };
}

/**
 * Schedule probation check-ins for an employee
 */
async function scheduleProbationCheckins(tenantId, companyId, employeeId, hireDate, managerId, hrAssigneeId = null) {
  const checkIns = [
    { type: '30_day', day: 30 },
    { type: '60_day', day: 60 },
    { type: '90_day', day: 90 }
  ];

  const results = [];
  const hireDateObj = new Date(hireDate);

  for (const checkIn of checkIns) {
    const scheduledDate = new Date(hireDateObj);
    scheduledDate.setDate(scheduledDate.getDate() + checkIn.day);

    // Check if already exists
    const existing = await pool.query(`
      SELECT id FROM probation_checkin_tasks
      WHERE employee_id = $1 AND checkin_type = $2
    `, [employeeId, checkIn.type]);

    if (existing.rows.length === 0) {
      const result = await pool.query(`
        INSERT INTO probation_checkin_tasks (
          tenant_id, company_id, employee_id,
          checkin_type, checkin_day, scheduled_date,
          manager_id, hr_assignee_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
        RETURNING *
      `, [
        tenantId,
        companyId,
        employeeId,
        checkIn.type,
        checkIn.day,
        scheduledDate,
        managerId,
        hrAssigneeId
      ]);
      results.push(result.rows[0]);
    }
  }

  return results;
}

/**
 * Activate employee (transition from preboarding/onboarding to active)
 */
async function activateEmployee(tenantId, employeeId, activatedBy) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check hard gates
    const gateCheck = await checkHardGates(tenantId, employeeId);
    if (!gateCheck.passed) {
      throw new Error(`Hard gates not passed: ${gateCheck.errors.join(', ')}`);
    }

    // Get employee details
    const empResult = await client.query(
      'SELECT company_id, hire_date, reports_to FROM employees WHERE id = $1',
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = empResult.rows[0];

    // Update employee status to active
    await client.query(`
      UPDATE employees
      SET employment_status = 'active', onboarding_completed_at = NOW()
      WHERE id = $1
    `, [employeeId]);

    // Update onboarding record
    await client.query(`
      UPDATE employee_onboarding
      SET overall_status = 'completed', completed_at = NOW()
      WHERE employee_id = $1
    `, [employeeId]);

    // Schedule probation check-ins
    const checkIns = await scheduleProbationCheckins(
      tenantId,
      employee.company_id,
      employeeId,
      employee.hire_date,
      employee.reports_to,
      activatedBy
    );

    await client.query('COMMIT');

    return {
      success: true,
      employeeId,
      status: 'active',
      checkInsScheduled: checkIns.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get onboarding progress summary
 */
async function getOnboardingProgress(tenantId, employeeId) {
  const onboardingResult = await pool.query(`
    SELECT eo.*, e.first_name, e.last_name, e.profile_completion_percentage
    FROM employee_onboarding eo
    JOIN employees e ON eo.employee_id = e.id
    WHERE eo.employee_id = $1 AND eo.tenant_id = $2
  `, [employeeId, tenantId]);

  if (onboardingResult.rows.length === 0) {
    return null;
  }

  const onboarding = onboardingResult.rows[0];

  // Get document stats per phase
  const docStats = await pool.query(`
    SELECT
      phase,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('signed', 'acknowledged', 'verified', 'uploaded')) as completed,
      COUNT(*) FILTER (WHERE is_required = true) as required_total,
      COUNT(*) FILTER (WHERE is_required = true AND status IN ('signed', 'acknowledged', 'verified', 'uploaded')) as required_completed
    FROM onboarding_documents
    WHERE employee_id = $1
    GROUP BY phase
    ORDER BY phase
  `, [employeeId]);

  const phases = {};
  for (const stat of docStats.rows) {
    phases[`phase${stat.phase}`] = {
      total: parseInt(stat.total),
      completed: parseInt(stat.completed),
      requiredTotal: parseInt(stat.required_total),
      requiredCompleted: parseInt(stat.required_completed),
      progress: stat.required_total > 0
        ? Math.round((stat.required_completed / stat.required_total) * 100)
        : 100
    };
  }

  // Overall progress
  const totalRequired = Object.values(phases).reduce((sum, p) => sum + p.requiredTotal, 0);
  const totalCompleted = Object.values(phases).reduce((sum, p) => sum + p.requiredCompleted, 0);

  return {
    onboarding,
    phases,
    overallProgress: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0,
    profileCompletion: onboarding.profile_completion_percentage || 0,
    hardGatesPassed: await checkHardGates(tenantId, employeeId)
  };
}

module.exports = {
  DEFAULT_PHASE_CONFIG,
  initializeOnboarding,
  checkHardGates,
  calculateProfileCompletion,
  updatePhaseStatus,
  scheduleProbationCheckins,
  activateEmployee,
  getOnboardingProgress
};
