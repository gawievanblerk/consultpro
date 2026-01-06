const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// ============================================================================
// PROBATION REVIEWS
// ============================================================================

// GET /api/probation/reviews - List probation reviews
router.get('/reviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, status, review_type } = req.query;

    let query = `
      SELECT
        pr.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        e.probation_end_date,
        r.first_name || ' ' || r.last_name as reviewer_name,
        c.trading_name as company_name
      FROM probation_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN companies c ON pr.company_id = c.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
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
    if (status) {
      query += ` AND pr.status = $${paramIdx++}`;
      params.push(status);
    }
    if (review_type) {
      query += ` AND pr.review_type = $${paramIdx++}`;
      params.push(review_type);
    }

    query += ' ORDER BY pr.review_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching probation reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch probation reviews' });
  }
});

// GET /api/probation/reviews/:id - Get single probation review
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
        e.hire_date,
        e.probation_start_date,
        e.probation_end_date,
        e.email as employee_email,
        r.first_name || ' ' || r.last_name as reviewer_full_name,
        c.trading_name as company_name,
        c.legal_name
      FROM probation_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN companies c ON pr.company_id = c.id
      LEFT JOIN employees r ON pr.reviewer_id = r.id
      WHERE pr.id = $1 AND pr.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Probation review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch probation review' });
  }
});

// POST /api/probation/reviews - Create probation review
router.post('/reviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, review_type, review_date,
      review_period_start, review_period_end,
      reviewer_id, reviewer_name, reviewer_title,
      job_knowledge_score, job_knowledge_comments,
      quality_of_work_score, quality_of_work_comments,
      productivity_score, productivity_comments,
      attendance_punctuality_score, attendance_punctuality_comments,
      communication_score, communication_comments,
      teamwork_score, teamwork_comments,
      initiative_score, initiative_comments,
      adaptability_score, adaptability_comments,
      strengths, areas_for_improvement,
      recommendation, extension_months, extension_reason,
      recommendation_comments
    } = req.body;

    // Calculate overall score
    const scores = [
      job_knowledge_score, quality_of_work_score, productivity_score,
      attendance_punctuality_score, communication_score, teamwork_score,
      initiative_score, adaptability_score
    ].filter(s => s != null);

    const overall_score = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      : null;

    // Determine rating based on score
    let overall_rating = null;
    if (overall_score) {
      if (overall_score >= 4.5) overall_rating = 'excellent';
      else if (overall_score >= 3.5) overall_rating = 'good';
      else if (overall_score >= 2.5) overall_rating = 'satisfactory';
      else if (overall_score >= 1.5) overall_rating = 'needs_improvement';
      else overall_rating = 'unsatisfactory';
    }

    const result = await pool.query(`
      INSERT INTO probation_reviews (
        tenant_id, company_id, employee_id, review_type, review_date,
        review_period_start, review_period_end,
        reviewer_id, reviewer_name, reviewer_title,
        job_knowledge_score, job_knowledge_comments,
        quality_of_work_score, quality_of_work_comments,
        productivity_score, productivity_comments,
        attendance_punctuality_score, attendance_punctuality_comments,
        communication_score, communication_comments,
        teamwork_score, teamwork_comments,
        initiative_score, initiative_comments,
        adaptability_score, adaptability_comments,
        overall_score, overall_rating,
        strengths, areas_for_improvement,
        recommendation, extension_months, extension_reason,
        recommendation_comments, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, 'draft', $35
      ) RETURNING *
    `, [
      tenantId, company_id, employee_id, review_type, review_date,
      review_period_start, review_period_end,
      reviewer_id, reviewer_name, reviewer_title,
      job_knowledge_score, job_knowledge_comments,
      quality_of_work_score, quality_of_work_comments,
      productivity_score, productivity_comments,
      attendance_punctuality_score, attendance_punctuality_comments,
      communication_score, communication_comments,
      teamwork_score, teamwork_comments,
      initiative_score, initiative_comments,
      adaptability_score, adaptability_comments,
      overall_score, overall_rating,
      strengths, areas_for_improvement,
      recommendation, extension_months, extension_reason,
      recommendation_comments, userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to create probation review' });
  }
});

// PUT /api/probation/reviews/:id - Update probation review
router.put('/reviews/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIdx = 1;

    const allowedFields = [
      'review_type', 'review_date', 'review_period_start', 'review_period_end',
      'reviewer_id', 'reviewer_name', 'reviewer_title',
      'job_knowledge_score', 'job_knowledge_comments',
      'quality_of_work_score', 'quality_of_work_comments',
      'productivity_score', 'productivity_comments',
      'attendance_punctuality_score', 'attendance_punctuality_comments',
      'communication_score', 'communication_comments',
      'teamwork_score', 'teamwork_comments',
      'initiative_score', 'initiative_comments',
      'adaptability_score', 'adaptability_comments',
      'strengths', 'areas_for_improvement',
      'recommendation', 'extension_months', 'extension_reason',
      'recommendation_comments', 'status'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIdx++}`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Recalculate overall score if scores are updated
    const scoreFields = [
      'job_knowledge_score', 'quality_of_work_score', 'productivity_score',
      'attendance_punctuality_score', 'communication_score', 'teamwork_score',
      'initiative_score', 'adaptability_score'
    ];

    if (scoreFields.some(f => updates[f] !== undefined)) {
      // Get existing scores
      const existing = await pool.query(
        'SELECT * FROM probation_reviews WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Review not found' });
      }

      const merged = { ...existing.rows[0], ...updates };
      const scores = scoreFields.map(f => merged[f]).filter(s => s != null);

      if (scores.length > 0) {
        const overall_score = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
        fields.push(`overall_score = $${paramIdx++}`);
        values.push(overall_score);

        let overall_rating = null;
        if (overall_score >= 4.5) overall_rating = 'excellent';
        else if (overall_score >= 3.5) overall_rating = 'good';
        else if (overall_score >= 2.5) overall_rating = 'satisfactory';
        else if (overall_score >= 1.5) overall_rating = 'needs_improvement';
        else overall_rating = 'unsatisfactory';

        fields.push(`overall_rating = $${paramIdx++}`);
        values.push(overall_rating);
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE probation_reviews
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Probation review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to update probation review' });
  }
});

// POST /api/probation/reviews/:id/submit - Submit review for approval
router.post('/reviews/:id/submit', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE probation_reviews
      SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot submit review - not found or not in draft status' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to submit probation review' });
  }
});

// POST /api/probation/reviews/:id/approve - Approve review and process recommendation
router.post('/reviews/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    // Get the review
    const reviewResult = await client.query(`
      SELECT pr.*, e.hire_date, e.probation_period_months, e.probation_end_date
      FROM probation_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.id = $1 AND pr.tenant_id = $2 AND pr.status = 'submitted'
    `, [id, tenantId]);

    if (reviewResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Review not found or not in submitted status' });
    }

    const review = reviewResult.rows[0];

    // Update review status
    await client.query(`
      UPDATE probation_reviews
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [userId, id]);

    // Process recommendation
    if (review.recommendation === 'confirm') {
      // Confirm employee
      await client.query(`
        UPDATE employees
        SET probation_status = 'confirmed',
            confirmation_date = CURRENT_DATE,
            employment_status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `, [review.employee_id]);

    } else if (review.recommendation === 'extend') {
      // Extend probation
      const newEndDate = new Date(review.probation_end_date);
      newEndDate.setMonth(newEndDate.getMonth() + (review.extension_months || 3));

      await client.query(`
        UPDATE employees
        SET probation_status = 'extended',
            probation_end_date = $1,
            probation_period_months = probation_period_months + $2,
            updated_at = NOW()
        WHERE id = $3
      `, [newEndDate.toISOString().split('T')[0], review.extension_months || 3, review.employee_id]);

    } else if (review.recommendation === 'terminate') {
      // Mark for termination
      await client.query(`
        UPDATE employees
        SET probation_status = 'terminated',
            employment_status = 'terminated',
            termination_date = CURRENT_DATE,
            termination_reason = 'Failed probation',
            updated_at = NOW()
        WHERE id = $1
      `, [review.employee_id]);
    }

    await client.query('COMMIT');

    // Fetch updated review
    const updatedResult = await pool.query(`
      SELECT pr.*, e.probation_status, e.confirmation_date, e.probation_end_date
      FROM probation_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.id = $1
    `, [id]);

    res.json({ success: true, data: updatedResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to approve probation review' });
  } finally {
    client.release();
  }
});

// POST /api/probation/reviews/:id/employee-acknowledge - Employee acknowledges review
router.post('/reviews/:id/employee-acknowledge', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { comments } = req.body;

    const result = await pool.query(`
      UPDATE probation_reviews
      SET employee_acknowledged = true,
          employee_acknowledged_at = NOW(),
          employee_comments = $1,
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [comments || null, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Probation review not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error acknowledging probation review:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge probation review' });
  }
});

// ============================================================================
// EMPLOYEES ON PROBATION
// ============================================================================

// GET /api/probation/employees - Get employees currently on probation
router.get('/employees', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, status } = req.query;

    let query = `
      SELECT
        e.id, e.employee_number, e.first_name, e.last_name,
        e.email, e.job_title, e.department,
        e.hire_date, e.probation_start_date, e.probation_end_date,
        e.probation_period_months, e.probation_status,
        c.trading_name as company_name,
        CASE
          WHEN e.probation_end_date < CURRENT_DATE THEN 'overdue'
          WHEN e.probation_end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'due_soon'
          ELSE 'on_track'
        END as probation_urgency,
        (SELECT COUNT(*) FROM probation_reviews pr WHERE pr.employee_id = e.id) as review_count
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      JOIN consultants con ON c.consultant_id = con.id
      WHERE con.tenant_id = $1
        AND e.probation_status IN ('pending', 'in_progress', 'extended')
        AND e.employment_status = 'active'
        AND e.deleted_at IS NULL
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND e.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (status) {
      query += ` AND e.probation_status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY e.probation_end_date ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employees on probation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees on probation' });
  }
});

// POST /api/probation/employees/:id/start - Start probation for an employee
router.post('/employees/:id/start', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { probation_period_months = 3 } = req.body;

    // Calculate end date based on hire date
    const result = await pool.query(`
      UPDATE employees
      SET probation_status = 'in_progress',
          probation_period_months = $1,
          probation_start_date = COALESCE(hire_date, CURRENT_DATE),
          probation_end_date = COALESCE(hire_date, CURRENT_DATE) + ($1 || ' months')::INTERVAL,
          updated_at = NOW()
      WHERE id = $2
        AND company_id IN (
          SELECT c.id FROM companies c
          JOIN consultants con ON c.consultant_id = con.id
          WHERE con.tenant_id = $3
        )
      RETURNING *
    `, [probation_period_months, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error starting probation:', error);
    res.status(500).json({ success: false, error: 'Failed to start probation' });
  }
});

// ============================================================================
// CONFIRMATION LETTERS
// ============================================================================

// GET /api/probation/confirmation-letters - List confirmation letters
router.get('/confirmation-letters', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, status } = req.query;

    let query = `
      SELECT
        cl.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        c.trading_name as company_name
      FROM confirmation_letters cl
      JOIN employees e ON cl.employee_id = e.id
      JOIN companies c ON cl.company_id = c.id
      WHERE cl.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND cl.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND cl.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (status) {
      query += ` AND cl.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY cl.letter_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching confirmation letters:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch confirmation letters' });
  }
});

// POST /api/probation/confirmation-letters - Create confirmation letter
router.post('/confirmation-letters', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, probation_review_id,
      letter_date, effective_date, letter_reference,
      new_salary, new_job_title, new_department,
      letter_content
    } = req.body;

    const result = await pool.query(`
      INSERT INTO confirmation_letters (
        tenant_id, company_id, employee_id, probation_review_id,
        letter_date, effective_date, letter_reference,
        new_salary, new_job_title, new_department,
        letter_content, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, probation_review_id,
      letter_date, effective_date, letter_reference,
      new_salary, new_job_title, new_department,
      letter_content, userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating confirmation letter:', error);
    res.status(500).json({ success: false, error: 'Failed to create confirmation letter' });
  }
});

module.exports = router;
