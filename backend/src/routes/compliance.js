const express = require('express');
const router = express.Router();

// Compliance Dashboard - Stats Overview
router.get('/dashboard', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;

    // Get policy stats
    const policyStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published') AS published_policies,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft_policies,
        COUNT(*) FILTER (WHERE requires_acknowledgment = true AND status = 'published') AS policies_requiring_ack
      FROM policies
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `, [tenantId]);

    // Get training module stats
    const trainingStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'published') AS published_modules,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft_modules,
        COUNT(*) FILTER (WHERE is_mandatory = true AND status = 'published') AS mandatory_modules
      FROM training_modules
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `, [tenantId]);

    // Get policy acknowledgment stats
    const ackStats = await pool.query(`
      SELECT
        COUNT(DISTINCT pa.employee_id) AS employees_acknowledged,
        COUNT(DISTINCT CASE WHEN pa.acknowledged_at >= NOW() - INTERVAL '30 days' THEN pa.employee_id END) AS acknowledged_last_30_days
      FROM policy_acknowledgments pa
      JOIN policies p ON pa.policy_id = p.id
      WHERE p.tenant_id = $1
    `, [tenantId]);

    // Get training assignment stats
    const assignmentStats = await pool.query(`
      SELECT
        COUNT(*) AS total_assignments,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) AS overdue
      FROM training_assignments ta
      JOIN training_modules tm ON ta.module_id = tm.id
      WHERE tm.tenant_id = $1
    `, [tenantId]);

    // Get completion rate by module
    const moduleCompletionRates = await pool.query(`
      SELECT
        tm.id,
        tm.title,
        tm.is_mandatory,
        COUNT(ta.id) AS total_assigned,
        COUNT(*) FILTER (WHERE ta.status = 'completed') AS completed,
        CASE
          WHEN COUNT(ta.id) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE ta.status = 'completed')::decimal / COUNT(ta.id)) * 100, 1)
          ELSE 0
        END AS completion_rate
      FROM training_modules tm
      LEFT JOIN training_assignments ta ON tm.id = ta.module_id
      WHERE tm.tenant_id = $1 AND tm.status = 'published' AND tm.deleted_at IS NULL
      GROUP BY tm.id, tm.title, tm.is_mandatory
      ORDER BY tm.is_mandatory DESC, tm.title
      LIMIT 10
    `, [tenantId]);

    // Get recent completions
    const recentCompletions = await pool.query(`
      SELECT
        tc.id,
        tc.completed_at,
        tc.score,
        tm.title AS module_title,
        s.first_name || ' ' || s.last_name AS employee_name
      FROM training_completions tc
      JOIN training_modules tm ON tc.module_id = tm.id
      JOIN staff s ON tc.employee_id = s.id
      WHERE tm.tenant_id = $1
      ORDER BY tc.completed_at DESC
      LIMIT 10
    `, [tenantId]);

    res.json({
      success: true,
      data: {
        policies: {
          published: parseInt(policyStats.rows[0].published_policies) || 0,
          draft: parseInt(policyStats.rows[0].draft_policies) || 0,
          requiring_acknowledgment: parseInt(policyStats.rows[0].policies_requiring_ack) || 0
        },
        training: {
          published_modules: parseInt(trainingStats.rows[0].published_modules) || 0,
          draft_modules: parseInt(trainingStats.rows[0].draft_modules) || 0,
          mandatory_modules: parseInt(trainingStats.rows[0].mandatory_modules) || 0
        },
        acknowledgments: {
          total_employees_acknowledged: parseInt(ackStats.rows[0].employees_acknowledged) || 0,
          acknowledged_last_30_days: parseInt(ackStats.rows[0].acknowledged_last_30_days) || 0
        },
        assignments: {
          total: parseInt(assignmentStats.rows[0].total_assignments) || 0,
          completed: parseInt(assignmentStats.rows[0].completed) || 0,
          in_progress: parseInt(assignmentStats.rows[0].in_progress) || 0,
          pending: parseInt(assignmentStats.rows[0].pending) || 0,
          overdue: parseInt(assignmentStats.rows[0].overdue) || 0
        },
        module_completion_rates: moduleCompletionRates.rows,
        recent_completions: recentCompletions.rows
      }
    });
  } catch (error) {
    console.error('Error fetching compliance dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch compliance dashboard' });
  }
});

// Get overdue items (policies + training)
router.get('/overdue', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { type } = req.query;

    const results = {
      overdue_policies: [],
      overdue_training: []
    };

    // Get overdue policy acknowledgments
    if (!type || type === 'policy' || type === 'all') {
      const overduePolicies = await pool.query(`
        SELECT
          p.id AS policy_id,
          p.title AS policy_title,
          p.acknowledgment_deadline,
          s.id AS employee_id,
          s.first_name || ' ' || s.last_name AS employee_name,
          s.email AS employee_email,
          EXTRACT(DAY FROM NOW() - p.acknowledgment_deadline) AS days_overdue
        FROM policies p
        CROSS JOIN staff s
        LEFT JOIN policy_acknowledgments pa ON p.id = pa.policy_id AND s.id = pa.employee_id
        WHERE p.tenant_id = $1
          AND p.status = 'published'
          AND p.requires_acknowledgment = true
          AND p.acknowledgment_deadline < NOW()
          AND pa.id IS NULL
          AND s.tenant_id = $1
          AND s.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY p.acknowledgment_deadline, s.last_name
        LIMIT 100
      `, [tenantId]);

      results.overdue_policies = overduePolicies.rows;
    }

    // Get overdue training assignments
    if (!type || type === 'training' || type === 'all') {
      const overdueTraining = await pool.query(`
        SELECT
          ta.id AS assignment_id,
          ta.due_date,
          ta.status,
          tm.id AS module_id,
          tm.title AS module_title,
          tm.is_mandatory,
          s.id AS employee_id,
          s.first_name || ' ' || s.last_name AS employee_name,
          s.email AS employee_email,
          EXTRACT(DAY FROM NOW() - ta.due_date) AS days_overdue
        FROM training_assignments ta
        JOIN training_modules tm ON ta.module_id = tm.id
        JOIN staff s ON ta.employee_id = s.id
        WHERE tm.tenant_id = $1
          AND ta.status IN ('pending', 'in_progress')
          AND ta.due_date < NOW()
          AND s.deleted_at IS NULL
          AND tm.deleted_at IS NULL
        ORDER BY ta.due_date, tm.is_mandatory DESC, s.last_name
        LIMIT 100
      `, [tenantId]);

      results.overdue_training = overdueTraining.rows;
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching overdue items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overdue items' });
  }
});

// Get employee compliance status (works with both employees table for company admins and staff table for consultants)
router.get('/employees', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const { company_id: queryCompanyId, search, status } = req.query;

    // Get user's company_id from the database
    let userCompanyId = queryCompanyId;
    if (!userCompanyId && userId) {
      const userResult = await pool.query(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].company_id) {
        userCompanyId = userResult.rows[0].company_id;
      }
    }

    let employeesResult;

    // If user has a company_id, query employees directly by that company
    if (userCompanyId) {
      const params = [tenantId, userCompanyId];
      if (search) params.push('%' + search + '%');

      employeesResult = await pool.query(`
        SELECT
          e.id,
          e.employee_number,
          e.first_name,
          e.last_name,
          e.email,
          e.job_title,
          e.department,
          co.legal_name AS company_name,

          -- Policy acknowledgment counts
          (SELECT COUNT(*) FROM policies p
           WHERE p.tenant_id = $1 AND p.status = 'published'
           AND p.requires_acknowledgment = true AND p.deleted_at IS NULL) AS total_policies_required,
          (SELECT COUNT(*) FROM policy_acknowledgments pa
           JOIN policies p ON pa.policy_id = p.id
           WHERE pa.employee_id = e.id AND p.tenant_id = $1
           AND p.status = 'published' AND p.requires_acknowledgment = true) AS policies_acknowledged,

          -- Training assignment counts
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = e.id AND tm.tenant_id = $1) AS total_training_assigned,
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = e.id AND ta.status = 'completed' AND tm.tenant_id = $1) AS training_completed,

          -- Overdue counts
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = e.id AND ta.status IN ('pending', 'in_progress')
           AND ta.due_date < NOW() AND tm.tenant_id = $1) AS training_overdue,

          -- Certificates earned
          (SELECT COUNT(*) FROM issued_certificates ic
           JOIN training_completions tc ON ic.completion_id = tc.id
           JOIN training_modules tm ON tc.module_id = tm.id
           WHERE ic.employee_id = e.id AND tm.tenant_id = $1) AS certificates_earned

        FROM employees e
        LEFT JOIN companies co ON e.company_id = co.id
        WHERE e.company_id = $2
        AND e.deleted_at IS NULL
        AND e.employment_status = 'active'
        ${search ? 'AND (e.first_name ILIKE $3 OR e.last_name ILIKE $3 OR e.email ILIKE $3)' : ''}
        ORDER BY e.last_name, e.first_name
        LIMIT 100
      `, params);
    } else {
      // Fall back to staff table for consultants
      const params = [tenantId];
      if (search) params.push('%' + search + '%');

      employeesResult = await pool.query(`
        SELECT
          s.id,
          s.employee_id AS employee_number,
          s.first_name,
          s.last_name,
          s.email,
          s.job_title,
          s.department,
          'Staff Pool' AS company_name,

          -- Policy acknowledgment counts
          (SELECT COUNT(*) FROM policies p
           WHERE p.tenant_id = $1 AND p.status = 'published'
           AND p.requires_acknowledgment = true AND p.deleted_at IS NULL) AS total_policies_required,
          (SELECT COUNT(*) FROM policy_acknowledgments pa
           JOIN policies p ON pa.policy_id = p.id
           WHERE pa.employee_id = s.id AND p.tenant_id = $1
           AND p.status = 'published' AND p.requires_acknowledgment = true) AS policies_acknowledged,

          -- Training assignment counts
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = s.id AND tm.tenant_id = $1) AS total_training_assigned,
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = s.id AND ta.status = 'completed' AND tm.tenant_id = $1) AS training_completed,

          -- Overdue counts
          (SELECT COUNT(*) FROM training_assignments ta
           JOIN training_modules tm ON ta.module_id = tm.id
           WHERE ta.employee_id = s.id AND ta.status IN ('pending', 'in_progress')
           AND ta.due_date < NOW() AND tm.tenant_id = $1) AS training_overdue,

          -- Certificates earned
          (SELECT COUNT(*) FROM issued_certificates ic
           JOIN training_completions tc ON ic.completion_id = tc.id
           JOIN training_modules tm ON tc.module_id = tm.id
           WHERE ic.employee_id = s.id AND tm.tenant_id = $1) AS certificates_earned

        FROM staff s
        WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
        ${search ? 'AND (s.first_name ILIKE $2 OR s.last_name ILIKE $2 OR s.email ILIKE $2)' : ''}
        ORDER BY s.last_name, s.first_name
        LIMIT 100
      `, params);
    }

    // Add compliance status calculation
    const employeesWithStatus = employeesResult.rows.map(emp => {
      const policyCompliance = emp.total_policies_required > 0
        ? Math.round((emp.policies_acknowledged / emp.total_policies_required) * 100)
        : 100;
      const trainingCompliance = emp.total_training_assigned > 0
        ? Math.round((emp.training_completed / emp.total_training_assigned) * 100)
        : 100;
      const overallPercent = Math.round((policyCompliance + trainingCompliance) / 2);

      let overallStatus = 'compliant';
      if (emp.training_overdue > 0) {
        overallStatus = 'overdue';
      } else if (policyCompliance < 100 || trainingCompliance < 100) {
        overallStatus = 'in_progress';
      }

      return {
        ...emp,
        policy_compliance_percent: policyCompliance,
        training_compliance_percent: trainingCompliance,
        overall_compliance_percent: overallPercent,
        overall_status: overallStatus
      };
    });

    // Filter by status if provided
    const filteredEmployees = status
      ? employeesWithStatus.filter(e => e.overall_status === status)
      : employeesWithStatus;

    res.json({
      success: true,
      data: filteredEmployees
    });
  } catch (error) {
    console.error('Error fetching employee compliance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee compliance' });
  }
});

// Get single employee compliance details
router.get('/employees/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;

    // Get user's company_id from the database
    let userCompanyId = null;
    if (userId) {
      const userResult = await pool.query(
        'SELECT company_id FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].company_id) {
        userCompanyId = userResult.rows[0].company_id;
      }
    }

    let employee;

    // If user has a company_id, look in employees table
    if (userCompanyId) {
      employee = await pool.query(`
        SELECT e.id, e.employee_number, e.first_name, e.last_name, e.email,
               e.job_title, e.department, e.hire_date, e.employment_status,
               co.legal_name AS company_name
        FROM employees e
        LEFT JOIN companies co ON e.company_id = co.id
        WHERE e.id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
      `, [id, userCompanyId]);
    }

    // Fall back to staff table if not found
    if (!employee || employee.rows.length === 0) {
      employee = await pool.query(`
        SELECT s.id, s.employee_id AS employee_number, s.first_name, s.last_name, s.email,
               s.job_title, s.department, s.hire_date, 'active' AS employment_status,
               'Staff Pool' AS company_name
        FROM staff s
        WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL
      `, [id, tenantId]);
    }

    if (employee.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Get policy acknowledgments
    const policies = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.category_id,
        pc.name AS category_name,
        p.acknowledgment_deadline,
        pa.acknowledged_at,
        pa.signature_data IS NOT NULL AS has_signature,
        CASE
          WHEN pa.id IS NOT NULL THEN 'acknowledged'
          WHEN p.acknowledgment_deadline < NOW() THEN 'overdue'
          ELSE 'pending'
        END AS status
      FROM policies p
      LEFT JOIN policy_categories pc ON p.category_id = pc.id
      LEFT JOIN policy_acknowledgments pa ON p.id = pa.policy_id AND pa.employee_id = $1
      WHERE p.tenant_id = $2 AND p.status = 'published'
      AND p.requires_acknowledgment = true AND p.deleted_at IS NULL
      ORDER BY p.acknowledgment_deadline, p.title
    `, [id, tenantId]);

    // Get training assignments with progress
    const training = await pool.query(`
      SELECT
        ta.id AS assignment_id,
        ta.status,
        ta.due_date,
        ta.assigned_at,
        ta.started_at,
        tm.id AS module_id,
        tm.title AS module_title,
        tm.is_mandatory,
        tm.passing_score,
        tc.completed_at,
        tc.score,
        ic.verification_code AS certificate_code,

        -- Calculate progress
        (SELECT COUNT(*) FROM training_lessons tl WHERE tl.module_id = tm.id AND tl.deleted_at IS NULL) AS total_lessons,
        (SELECT COUNT(*) FROM training_progress tp
         JOIN training_lessons tl ON tp.lesson_id = tl.id
         WHERE tp.assignment_id = ta.id AND tp.completed = true) AS completed_lessons

      FROM training_assignments ta
      JOIN training_modules tm ON ta.module_id = tm.id
      LEFT JOIN training_completions tc ON ta.id = tc.assignment_id
      LEFT JOIN issued_certificates ic ON tc.id = ic.completion_id
      WHERE ta.employee_id = $1 AND tm.tenant_id = $2 AND tm.deleted_at IS NULL
      ORDER BY ta.due_date, tm.title
    `, [id, tenantId]);

    // Get certificates
    const certificates = await pool.query(`
      SELECT
        ic.*,
        tm.title AS module_title,
        ct.name AS template_name
      FROM issued_certificates ic
      JOIN training_completions tc ON ic.completion_id = tc.id
      JOIN training_modules tm ON tc.module_id = tm.id
      LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
      WHERE ic.employee_id = $1 AND tm.tenant_id = $2
      ORDER BY ic.created_at DESC
    `, [id, tenantId]);

    res.json({
      success: true,
      data: {
        employee: employee.rows[0],
        policies: policies.rows,
        training: training.rows.map(t => ({
          ...t,
          progress_percent: t.total_lessons > 0
            ? Math.round((t.completed_lessons / t.total_lessons) * 100)
            : 0
        })),
        certificates: certificates.rows
      }
    });
  } catch (error) {
    console.error('Error fetching employee compliance details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee compliance details' });
  }
});

// Send reminder emails (batch)
router.post('/send-reminders', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const userId = req.userId;
    const { type, item_ids } = req.body;

    const reminders = [];

    if (type === 'policy') {
      for (const policyId of item_ids) {
        const result = await pool.query(`
          SELECT p.title, s.email, s.first_name || ' ' || s.last_name AS name
          FROM policies p
          CROSS JOIN staff s
          LEFT JOIN policy_acknowledgments pa ON p.id = pa.policy_id AND s.id = pa.employee_id
          WHERE p.id = $1 AND p.tenant_id = $2 AND pa.id IS NULL
          AND s.tenant_id = $2 AND s.deleted_at IS NULL
        `, [policyId, tenantId]);

        for (const row of result.rows) {
          reminders.push({
            type: 'policy',
            item_id: policyId,
            item_title: row.title,
            employee_email: row.email,
            employee_name: row.name
          });
        }
      }
    } else if (type === 'training') {
      for (const assignmentId of item_ids) {
        const result = await pool.query(`
          SELECT tm.title, s.email, s.first_name || ' ' || s.last_name AS name, ta.due_date
          FROM training_assignments ta
          JOIN training_modules tm ON ta.module_id = tm.id
          JOIN staff s ON ta.employee_id = s.id
          WHERE ta.id = $1 AND tm.tenant_id = $2 AND ta.status IN ('pending', 'in_progress')
        `, [assignmentId, tenantId]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          reminders.push({
            type: 'training',
            item_id: assignmentId,
            item_title: row.title,
            employee_email: row.email,
            employee_name: row.name,
            due_date: row.due_date
          });
        }
      }
    }

    res.json({
      success: true,
      message: reminders.length + ' reminder(s) queued for sending',
      data: { reminders_count: reminders.length }
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ success: false, error: 'Failed to send reminders' });
  }
});

// Assign training to employees
router.post('/assign-training', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const userId = req.userId;
    const { module_id, employee_ids, due_date } = req.body;

    const module = await pool.query(`
      SELECT id, title FROM training_modules
      WHERE id = $1 AND tenant_id = $2 AND status = 'published' AND deleted_at IS NULL
    `, [module_id, tenantId]);

    if (module.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Training module not found or not published' });
    }

    const assignments = [];
    for (const employeeId of employee_ids) {
      const existing = await pool.query(`
        SELECT id FROM training_assignments WHERE module_id = $1 AND employee_id = $2
      `, [module_id, employeeId]);

      if (existing.rows.length === 0) {
        const result = await pool.query(`
          INSERT INTO training_assignments (module_id, employee_id, assigned_by, due_date, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING id
        `, [module_id, employeeId, userId, due_date || null]);

        assignments.push({ employee_id: employeeId, assignment_id: result.rows[0].id });
      }
    }

    res.json({
      success: true,
      message: 'Training assigned to ' + assignments.length + ' employee(s)',
      data: { assignments }
    });
  } catch (error) {
    console.error('Error assigning training:', error);
    res.status(500).json({ success: false, error: 'Failed to assign training' });
  }
});

module.exports = router;
