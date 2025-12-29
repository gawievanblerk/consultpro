const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

/**
 * GET /api/training-progress/my-assignments
 * Get current employee's training assignments
 */
router.get('/my-assignments', async (req, res) => {
  try {
    // Get employee linked to user
    const employee = await pool.query(
      `SELECT id, company_id FROM employees WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (employee.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const employeeId = employee.rows[0].id;

    const result = await pool.query(
      `SELECT
        ta.*,
        tm.title as module_title,
        tm.description as module_description,
        tm.estimated_duration_minutes,
        tm.passing_score,
        tm.thumbnail_url,
        pc.name as category_name,
        (SELECT COUNT(*) FROM training_lessons WHERE module_id = tm.id) as total_lessons,
        (SELECT COUNT(*) FROM training_progress tp
         WHERE tp.assignment_id = ta.id AND tp.completed_at IS NOT NULL) as completed_lessons,
        (SELECT COUNT(*) FROM training_quizzes WHERE module_id = tm.id) as total_quizzes
      FROM training_assignments ta
      JOIN training_modules tm ON ta.module_id = tm.id
      LEFT JOIN policy_categories pc ON tm.category_id = pc.id
      WHERE ta.employee_id = $1
        AND tm.deleted_at IS NULL
      ORDER BY
        CASE ta.status
          WHEN 'in_progress' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'overdue' THEN 3
          ELSE 4
        END,
        ta.due_date ASC`,
      [employeeId]
    );

    // Calculate progress percentage
    const assignments = result.rows.map(a => ({
      ...a,
      progress_percent: a.total_lessons > 0
        ? Math.round((a.completed_lessons / a.total_lessons) * 100)
        : 0
    }));

    res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/training-progress/assignment/:id
 * Get assignment details with progress
 */
router.get('/assignment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify assignment belongs to user's employee record
    const employee = await pool.query(
      `SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (employee.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'No employee record found' });
    }

    const assignment = await pool.query(
      `SELECT
        ta.*,
        tm.id as module_id,
        tm.title as module_title,
        tm.description as module_description,
        tm.objectives,
        tm.estimated_duration_minutes,
        tm.passing_score,
        tm.max_attempts,
        tm.allow_skip
      FROM training_assignments ta
      JOIN training_modules tm ON ta.module_id = tm.id
      WHERE ta.id = $1 AND ta.employee_id = $2`,
      [id, employee.rows[0].id]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const moduleId = assignment.rows[0].module_id;

    // Get lessons with progress
    const lessons = await pool.query(
      `SELECT
        tl.*,
        tp.started_at,
        tp.completed_at,
        tp.time_spent_seconds,
        tp.video_progress_seconds,
        tp.video_completed
      FROM training_lessons tl
      LEFT JOIN training_progress tp ON tp.lesson_id = tl.id AND tp.assignment_id = $1
      WHERE tl.module_id = $2
      ORDER BY tl.sort_order ASC`,
      [id, moduleId]
    );

    // Get quizzes with attempts
    const quizzes = await pool.query(
      `SELECT
        tq.*,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = tq.id AND qa.assignment_id = $1) as attempt_count,
        (SELECT MAX(score) FROM quiz_attempts qa WHERE qa.quiz_id = tq.id AND qa.assignment_id = $1) as best_score,
        (SELECT passed FROM quiz_attempts qa WHERE qa.quiz_id = tq.id AND qa.assignment_id = $1 ORDER BY score DESC LIMIT 1) as passed
      FROM training_quizzes tq
      WHERE tq.module_id = $2
      ORDER BY tq.sort_order ASC`,
      [id, moduleId]
    );

    res.json({
      success: true,
      data: {
        ...assignment.rows[0],
        lessons: lessons.rows,
        quizzes: quizzes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assignment' });
  }
});

/**
 * POST /api/training-progress/lesson/:lessonId/start
 * Mark lesson as started
 */
router.post('/lesson/:lessonId/start', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { assignment_id } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    // Verify assignment belongs to user
    const employee = await pool.query(
      `SELECT e.id FROM employees e
       JOIN training_assignments ta ON ta.employee_id = e.id
       WHERE e.user_id = $1 AND ta.id = $2`,
      [req.user.id, assignment_id]
    );

    if (employee.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Create or update progress record
    const result = await pool.query(
      `INSERT INTO training_progress (assignment_id, lesson_id, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (assignment_id, lesson_id)
       DO UPDATE SET started_at = COALESCE(training_progress.started_at, CURRENT_TIMESTAMP)
       RETURNING *`,
      [assignment_id, lessonId]
    );

    // Update assignment status to in_progress
    await pool.query(
      `UPDATE training_assignments SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'`,
      [assignment_id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error starting lesson:', error);
    res.status(500).json({ success: false, error: 'Failed to start lesson' });
  }
});

/**
 * POST /api/training-progress/lesson/:lessonId/complete
 * Mark lesson as completed
 */
router.post('/lesson/:lessonId/complete', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { assignment_id, time_spent_seconds = 0 } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    // Verify assignment belongs to user
    const employee = await pool.query(
      `SELECT e.id FROM employees e
       JOIN training_assignments ta ON ta.employee_id = e.id
       WHERE e.user_id = $1 AND ta.id = $2`,
      [req.user.id, assignment_id]
    );

    if (employee.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Update progress record
    const result = await pool.query(
      `INSERT INTO training_progress (assignment_id, lesson_id, started_at, completed_at, time_spent_seconds)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3)
       ON CONFLICT (assignment_id, lesson_id)
       DO UPDATE SET
         completed_at = CURRENT_TIMESTAMP,
         time_spent_seconds = training_progress.time_spent_seconds + $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [assignment_id, lessonId, time_spent_seconds]
    );

    // Check if all lessons completed
    await checkModuleCompletion(assignment_id);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ success: false, error: 'Failed to complete lesson' });
  }
});

/**
 * PUT /api/training-progress/lesson/:lessonId/video-progress
 * Update video progress
 */
router.put('/lesson/:lessonId/video-progress', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { assignment_id, video_progress_seconds, video_completed = false } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    const result = await pool.query(
      `UPDATE training_progress SET
        video_progress_seconds = $1,
        video_completed = $2,
        updated_at = CURRENT_TIMESTAMP
       WHERE assignment_id = $3 AND lesson_id = $4
       RETURNING *`,
      [video_progress_seconds, video_completed, assignment_id, lessonId]
    );

    if (result.rows.length === 0) {
      // Create record if doesn't exist
      const insert = await pool.query(
        `INSERT INTO training_progress (assignment_id, lesson_id, started_at, video_progress_seconds, video_completed)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
         RETURNING *`,
        [assignment_id, lessonId, video_progress_seconds, video_completed]
      );
      return res.json({ success: true, data: insert.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update video progress' });
  }
});

/**
 * GET /api/training-progress/quiz/:quizId
 * Get quiz with questions for taking
 */
router.get('/quiz/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { assignment_id } = req.query;

    // Get quiz
    const quiz = await pool.query(
      `SELECT * FROM training_quizzes WHERE id = $1`,
      [quizId]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    // Get questions (without correct answers)
    let questions = await pool.query(
      `SELECT id, question_text, question_type, options, points, sort_order
       FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC`,
      [quizId]
    );

    // Remove is_correct from options for the employee view
    const sanitizedQuestions = questions.rows.map(q => ({
      ...q,
      options: q.options.map(opt => ({ id: opt.id, text: opt.text }))
    }));

    // Randomize if needed
    let finalQuestions = sanitizedQuestions;
    if (quiz.rows[0].randomize_questions) {
      finalQuestions = sanitizedQuestions.sort(() => Math.random() - 0.5);
    }

    // Limit questions if needed
    if (quiz.rows[0].questions_to_show > 0) {
      finalQuestions = finalQuestions.slice(0, quiz.rows[0].questions_to_show);
    }

    // Get attempt count
    const attempts = await pool.query(
      `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND assignment_id = $2`,
      [quizId, assignment_id]
    );

    res.json({
      success: true,
      data: {
        ...quiz.rows[0],
        questions: finalQuestions,
        attempt_count: parseInt(attempts.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
  }
});

/**
 * POST /api/training-progress/quiz/:quizId/start
 * Start a quiz attempt
 */
router.post('/quiz/:quizId/start', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { assignment_id } = req.body;

    if (!assignment_id) {
      return res.status(400).json({ success: false, error: 'assignment_id is required' });
    }

    // Get assignment and module info
    const assignment = await pool.query(
      `SELECT ta.*, tm.max_attempts FROM training_assignments ta
       JOIN training_modules tm ON ta.module_id = tm.id
       WHERE ta.id = $1`,
      [assignment_id]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Check attempt count
    const attempts = await pool.query(
      `SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = $1 AND assignment_id = $2`,
      [quizId, assignment_id]
    );

    const attemptCount = parseInt(attempts.rows[0].count);
    const maxAttempts = assignment.rows[0].max_attempts;

    if (maxAttempts > 0 && attemptCount >= maxAttempts) {
      return res.status(400).json({
        success: false,
        error: `Maximum attempts (${maxAttempts}) reached`
      });
    }

    // Create attempt
    const result = await pool.query(
      `INSERT INTO quiz_attempts (assignment_id, quiz_id, attempt_number, started_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [assignment_id, quizId, attemptCount + 1]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to start quiz' });
  }
});

/**
 * POST /api/training-progress/quiz/:quizId/submit
 * Submit quiz answers
 */
router.post('/quiz/:quizId/submit', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { assignment_id, attempt_id, answers } = req.body;
    // answers: [{ question_id, selected_options: [option_ids] }]

    if (!assignment_id || !attempt_id || !answers) {
      return res.status(400).json({ success: false, error: 'assignment_id, attempt_id, and answers are required' });
    }

    // Get quiz passing score
    const quiz = await pool.query(
      `SELECT passing_score, show_correct_answers FROM training_quizzes WHERE id = $1`,
      [quizId]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    // Get questions with correct answers
    const questions = await pool.query(
      `SELECT id, options, points FROM quiz_questions WHERE quiz_id = $1`,
      [quizId]
    );

    // Score the quiz
    let pointsEarned = 0;
    let pointsPossible = 0;
    const gradedAnswers = [];

    for (const question of questions.rows) {
      pointsPossible += question.points;

      const answer = answers.find(a => a.question_id === question.id);
      const correctOptions = question.options.filter(o => o.is_correct).map(o => o.id);
      const selectedOptions = answer?.selected_options || [];

      // Check if answer is correct (all correct options selected, no incorrect ones)
      const isCorrect = correctOptions.length === selectedOptions.length &&
        correctOptions.every(co => selectedOptions.includes(co));

      if (isCorrect) {
        pointsEarned += question.points;
      }

      gradedAnswers.push({
        question_id: question.id,
        selected_options: selectedOptions,
        is_correct: isCorrect,
        points: isCorrect ? question.points : 0
      });
    }

    const score = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;
    const passed = score >= quiz.rows[0].passing_score;

    // Update attempt
    const result = await pool.query(
      `UPDATE quiz_attempts SET
        submitted_at = CURRENT_TIMESTAMP,
        score = $1,
        points_earned = $2,
        points_possible = $3,
        passed = $4,
        answers = $5
       WHERE id = $6
       RETURNING *`,
      [score, pointsEarned, pointsPossible, passed, JSON.stringify(gradedAnswers), attempt_id]
    );

    // Check if module completed
    if (passed) {
      await checkModuleCompletion(assignment_id);
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        show_correct_answers: quiz.rows[0].show_correct_answers
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz' });
  }
});

/**
 * Helper: Check if module is completed and create completion record
 */
async function checkModuleCompletion(assignmentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get assignment details
    const assignment = await client.query(
      `SELECT ta.*, tm.passing_score, e.id as employee_id
       FROM training_assignments ta
       JOIN training_modules tm ON ta.module_id = tm.id
       JOIN employees e ON ta.employee_id = e.id
       WHERE ta.id = $1`,
      [assignmentId]
    );

    if (assignment.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const { module_id, tenant_id, employee_id, due_date, passing_score } = assignment.rows[0];

    // Check all required lessons completed
    const lessonCheck = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM training_lessons WHERE module_id = $1 AND is_required = true) as required_count,
        (SELECT COUNT(*) FROM training_progress tp
         JOIN training_lessons tl ON tp.lesson_id = tl.id
         WHERE tp.assignment_id = $2 AND tp.completed_at IS NOT NULL AND tl.is_required = true) as completed_count`,
      [module_id, assignmentId]
    );

    const { required_count, completed_count } = lessonCheck.rows[0];

    if (parseInt(required_count) > parseInt(completed_count)) {
      await client.query('ROLLBACK');
      return; // Not all lessons completed
    }

    // Check quiz passed (if any quizzes exist)
    const quizCheck = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM training_quizzes WHERE module_id = $1) as quiz_count,
        (SELECT MAX(score) FROM quiz_attempts qa
         JOIN training_quizzes tq ON qa.quiz_id = tq.id
         WHERE qa.assignment_id = $2) as best_score,
        (SELECT id FROM quiz_attempts qa
         JOIN training_quizzes tq ON qa.quiz_id = tq.id
         WHERE qa.assignment_id = $2 AND qa.passed = true
         ORDER BY qa.score DESC LIMIT 1) as passing_attempt_id`,
      [module_id, assignmentId]
    );

    const { quiz_count, best_score, passing_attempt_id } = quizCheck.rows[0];

    if (parseInt(quiz_count) > 0 && !passing_attempt_id) {
      await client.query('ROLLBACK');
      return; // Quiz exists but not passed
    }

    // Calculate total time
    const timeResult = await client.query(
      `SELECT COALESCE(SUM(time_spent_seconds), 0) as total_time
       FROM training_progress WHERE assignment_id = $1`,
      [assignmentId]
    );

    const totalTime = parseInt(timeResult.rows[0].total_time);
    const wasOverdue = due_date ? new Date() > new Date(due_date) : false;

    // Create completion record
    await client.query(
      `INSERT INTO training_completions (
        tenant_id, assignment_id, employee_id, module_id,
        completed_at, quiz_score, quiz_passed, quiz_attempt_id,
        total_time_seconds, due_date, was_overdue
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING`,
      [
        tenant_id,
        assignmentId,
        employee_id,
        module_id,
        best_score,
        !!passing_attempt_id,
        passing_attempt_id,
        totalTime,
        due_date,
        wasOverdue
      ]
    );

    // Update assignment status
    await client.query(
      `UPDATE training_assignments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [assignmentId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking module completion:', error);
  } finally {
    client.release();
  }
}

module.exports = router;
