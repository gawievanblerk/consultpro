const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// ============================================================================
// PERFORMANCE CYCLES
// ============================================================================

// GET /api/performance/cycles - List performance cycles
router.get('/cycles', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, status } = req.query;

    let query = `
      SELECT
        pc.*,
        c.trading_name as company_name,
        (SELECT COUNT(*) FROM performance_reviews pr WHERE pr.cycle_id = pc.id) as review_count,
        (SELECT COUNT(*) FROM performance_reviews pr WHERE pr.cycle_id = pc.id AND pr.status = 'completed') as completed_count
      FROM performance_cycles pc
      JOIN companies c ON pc.company_id = c.id
      WHERE pc.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND pc.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (status) {
      query += ` AND pc.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY pc.start_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching performance cycles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance cycles' });
  }
});

// POST /api/performance/cycles - Create performance cycle
router.post('/cycles', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { company_id, name, description, cycle_type, start_date, end_date, review_deadline } = req.body;

    const result = await pool.query(`
      INSERT INTO performance_cycles (
        tenant_id, company_id, name, description, cycle_type,
        start_date, end_date, review_deadline, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
      RETURNING *
    `, [tenantId, company_id, name, description, cycle_type, start_date, end_date, review_deadline, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating performance cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to create performance cycle' });
  }
});

// PUT /api/performance/cycles/:id - Update performance cycle
router.put('/cycles/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { name, description, cycle_type, start_date, end_date, review_deadline, status } = req.body;

    const result = await pool.query(`
      UPDATE performance_cycles
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          cycle_type = COALESCE($3, cycle_type),
          start_date = COALESCE($4, start_date),
          end_date = COALESCE($5, end_date),
          review_deadline = COALESCE($6, review_deadline),
          status = COALESCE($7, status),
          updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [name, description, cycle_type, start_date, end_date, review_deadline, status, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance cycle not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating performance cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to update performance cycle' });
  }
});

// POST /api/performance/cycles/:id/initiate - Create reviews for all eligible employees
router.post('/cycles/:id/initiate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    // Get cycle details
    const cycleResult = await client.query(
      'SELECT * FROM performance_cycles WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Performance cycle not found' });
    }

    const cycle = cycleResult.rows[0];

    // Get all active, confirmed employees in the company
    const employeesResult = await client.query(`
      SELECT e.id, e.reports_to
      FROM employees e
      WHERE e.company_id = $1
        AND e.employment_status = 'active'
        AND e.probation_status = 'confirmed'
        AND e.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM performance_reviews pr
          WHERE pr.employee_id = e.id AND pr.cycle_id = $2
        )
    `, [cycle.company_id, id]);

    // Create reviews for each employee
    let createdCount = 0;
    for (const emp of employeesResult.rows) {
      await client.query(`
        INSERT INTO performance_reviews (
          tenant_id, company_id, employee_id, cycle_id,
          review_period_start, review_period_end,
          reviewer_id, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      `, [
        tenantId, cycle.company_id, emp.id, id,
        cycle.start_date, cycle.end_date,
        emp.reports_to, userId
      ]);
      createdCount++;
    }

    // Update cycle status
    await client.query(`
      UPDATE performance_cycles SET status = 'active', updated_at = NOW() WHERE id = $1
    `, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: `Created ${createdCount} performance reviews`, count: createdCount });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initiating performance cycle:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate performance cycle' });
  } finally {
    client.release();
  }
});

// ============================================================================
// PERFORMANCE REVIEWS
// ============================================================================

// GET /api/performance/reviews - List performance reviews
router.get('/reviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, cycle_id, reviewer_id, status } = req.query;

    let query = `
      SELECT
        pr.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        r.first_name || ' ' || r.last_name as reviewer_full_name,
        pc.name as cycle_name,
        c.trading_name as company_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN companies c ON pr.company_id = c.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
      LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.id
      WHERE pr.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND pr.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND pr.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (cycle_id) {
      query += ` AND pr.cycle_id = $${paramIdx++}`;
      params.push(cycle_id);
    }
    if (reviewer_id) {
      query += ` AND pr.reviewer_id = $${paramIdx++}`;
      params.push(reviewer_id);
    }
    if (status) {
      query += ` AND pr.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY pr.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching performance reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance reviews' });
  }
});

// GET /api/performance/reviews/:id - Get single performance review with KPIs
router.get('/reviews/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        pr.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.email as employee_email,
        e.hire_date,
        r.first_name || ' ' || r.last_name as reviewer_full_name,
        r.job_title as reviewer_job_title,
        pc.name as cycle_name,
        c.trading_name as company_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN companies c ON pr.company_id = c.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
      LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.id
      WHERE pr.id = $1 AND pr.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    // Get KPIs
    const kpisResult = await pool.query(`
      SELECT * FROM performance_kpis
      WHERE review_id = $1 AND tenant_id = $2
      ORDER BY created_at ASC
    `, [id, tenantId]);

    const review = result.rows[0];
    review.kpis = kpisResult.rows;

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching performance review:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance review' });
  }
});

// POST /api/performance/reviews - Create ad-hoc performance review
router.post('/reviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, cycle_id,
      review_period_start, review_period_end,
      reviewer_id
    } = req.body;

    const result = await pool.query(`
      INSERT INTO performance_reviews (
        tenant_id, company_id, employee_id, cycle_id,
        review_period_start, review_period_end,
        reviewer_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, cycle_id,
      review_period_start, review_period_end,
      reviewer_id, userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating performance review:', error);
    res.status(500).json({ success: false, error: 'Failed to create performance review' });
  }
});

// PUT /api/performance/reviews/:id - Update performance review
router.put('/reviews/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update
    const allowedFields = [
      'review_date', 'reviewer_name', 'reviewer_title',
      'job_knowledge_score', 'job_knowledge_comments',
      'quality_of_work_score', 'quality_of_work_comments',
      'productivity_score', 'productivity_comments',
      'communication_score', 'communication_comments',
      'teamwork_score', 'teamwork_comments',
      'leadership_score', 'leadership_comments',
      'problem_solving_score', 'problem_solving_comments',
      'initiative_score', 'initiative_comments',
      'attendance_score', 'attendance_comments',
      'key_achievements', 'areas_of_strength', 'areas_for_development',
      'goals_for_next_period', 'development_plan', 'training_recommendations',
      'salary_increase_recommended', 'salary_increase_percentage',
      'promotion_recommended', 'promotion_details',
      'status'
    ];

    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIdx++}`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Calculate overall score
    const scoreFields = [
      'job_knowledge_score', 'quality_of_work_score', 'productivity_score',
      'communication_score', 'teamwork_score', 'leadership_score',
      'problem_solving_score', 'initiative_score', 'attendance_score'
    ];

    if (scoreFields.some(f => updates[f] !== undefined)) {
      const existing = await pool.query(
        'SELECT * FROM performance_reviews WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (existing.rows.length > 0) {
        const merged = { ...existing.rows[0], ...updates };
        const scores = scoreFields.map(f => merged[f]).filter(s => s != null);

        if (scores.length > 0) {
          const overall_score = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
          fields.push(`overall_score = $${paramIdx++}`);
          values.push(overall_score);

          let overall_rating = null;
          if (overall_score >= 4.5) overall_rating = 'outstanding';
          else if (overall_score >= 3.5) overall_rating = 'exceeds_expectations';
          else if (overall_score >= 2.5) overall_rating = 'meets_expectations';
          else if (overall_score >= 1.5) overall_rating = 'needs_improvement';
          else overall_rating = 'unsatisfactory';

          fields.push(`overall_rating = $${paramIdx++}`);
          values.push(overall_rating);
        }
      }
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE performance_reviews
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating performance review:', error);
    res.status(500).json({ success: false, error: 'Failed to update performance review' });
  }
});

// POST /api/performance/reviews/:id/self-assessment - Employee submits self-assessment
router.post('/reviews/:id/self-assessment', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { achievements, challenges, goals } = req.body;

    const result = await pool.query(`
      UPDATE performance_reviews
      SET self_assessment_completed = true,
          self_assessment_date = CURRENT_DATE,
          self_assessment_achievements = $1,
          self_assessment_challenges = $2,
          self_assessment_goals = $3,
          status = CASE WHEN status = 'pending' THEN 'self_assessment' ELSE status END,
          updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [achievements, challenges, goals, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting self-assessment:', error);
    res.status(500).json({ success: false, error: 'Failed to submit self-assessment' });
  }
});

// POST /api/performance/reviews/:id/manager-approve - Manager approves review
router.post('/reviews/:id/manager-approve', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE performance_reviews
      SET manager_approved = true,
          manager_approved_at = NOW(),
          status = 'calibration',
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ success: false, error: 'Failed to approve review' });
  }
});

// POST /api/performance/reviews/:id/hr-approve - HR approves and completes review
router.post('/reviews/:id/hr-approve', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE performance_reviews
      SET hr_approved = true,
          hr_approved_at = NOW(),
          hr_approved_by = $1,
          status = 'completed',
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [userId, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error HR approving review:', error);
    res.status(500).json({ success: false, error: 'Failed to HR approve review' });
  }
});

// POST /api/performance/reviews/:id/employee-acknowledge - Employee acknowledges review
router.post('/reviews/:id/employee-acknowledge', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { comments, agrees } = req.body;

    const result = await pool.query(`
      UPDATE performance_reviews
      SET employee_acknowledged = true,
          employee_acknowledged_at = NOW(),
          employee_comments = $1,
          employee_agrees = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [comments, agrees, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Performance review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error acknowledging review:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge review' });
  }
});

// ============================================================================
// KPIs
// ============================================================================

// GET /api/performance/kpis - List KPIs
router.get('/kpis', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employee_id, review_id, status } = req.query;

    let query = `
      SELECT
        k.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.job_title,
        e.department
      FROM performance_kpis k
      JOIN employees e ON k.employee_id = e.id
      WHERE k.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (employee_id) {
      query += ` AND k.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (review_id) {
      query += ` AND k.review_id = $${paramIdx++}`;
      params.push(review_id);
    }
    if (status) {
      query += ` AND k.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY k.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPIs' });
  }
});

// POST /api/performance/kpis - Create KPI
router.post('/kpis', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, review_id,
      kpi_name, kpi_description, category,
      target_value, target_unit, weight
    } = req.body;

    const result = await pool.query(`
      INSERT INTO performance_kpis (
        tenant_id, company_id, employee_id, review_id,
        kpi_name, kpi_description, category,
        target_value, target_unit, weight,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, review_id,
      kpi_name, kpi_description, category,
      target_value, target_unit, weight, userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating KPI:', error);
    res.status(500).json({ success: false, error: 'Failed to create KPI' });
  }
});

// PUT /api/performance/kpis/:id - Update KPI (including achievement)
router.put('/kpis/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const {
      kpi_name, kpi_description, category,
      target_value, target_unit, weight,
      actual_value, achievement_percentage, achievement_date,
      score, comments, evidence, status
    } = req.body;

    const result = await pool.query(`
      UPDATE performance_kpis
      SET kpi_name = COALESCE($1, kpi_name),
          kpi_description = COALESCE($2, kpi_description),
          category = COALESCE($3, category),
          target_value = COALESCE($4, target_value),
          target_unit = COALESCE($5, target_unit),
          weight = COALESCE($6, weight),
          actual_value = COALESCE($7, actual_value),
          achievement_percentage = COALESCE($8, achievement_percentage),
          achievement_date = COALESCE($9, achievement_date),
          score = COALESCE($10, score),
          comments = COALESCE($11, comments),
          evidence = COALESCE($12, evidence),
          status = COALESCE($13, status),
          updated_at = NOW()
      WHERE id = $14 AND tenant_id = $15
      RETURNING *
    `, [
      kpi_name, kpi_description, category,
      target_value, target_unit, weight,
      actual_value, achievement_percentage, achievement_date,
      score, comments, evidence, status, id, tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KPI not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ success: false, error: 'Failed to update KPI' });
  }
});

// DELETE /api/performance/kpis/:id - Delete KPI
router.delete('/kpis/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM performance_kpis WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KPI not found' });
    }

    res.json({ success: true, message: 'KPI deleted' });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    res.status(500).json({ success: false, error: 'Failed to delete KPI' });
  }
});

// ============================================================================
// EMPLOYEE ESS - My Performance Reviews
// ============================================================================

// GET /api/performance/my-reviews - Employee's own reviews
router.get('/my-reviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found in user profile' });
    }

    const result = await pool.query(`
      SELECT
        pr.*,
        pc.name as cycle_name,
        r.first_name || ' ' || r.last_name as reviewer_full_name
      FROM performance_reviews pr
      LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
      WHERE pr.employee_id = $1 AND pr.tenant_id = $2
      ORDER BY pr.review_period_end DESC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your reviews' });
  }
});

// GET /api/performance/my-kpis - Employee's own KPIs
router.get('/my-kpis', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found in user profile' });
    }

    const result = await pool.query(`
      SELECT * FROM performance_kpis
      WHERE employee_id = $1 AND tenant_id = $2 AND status = 'active'
      ORDER BY created_at DESC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my KPIs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your KPIs' });
  }
});

module.exports = router;
