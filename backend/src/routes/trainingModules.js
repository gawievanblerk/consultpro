const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure multer for video/document uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const TRAINING_DIR = path.join(UPLOAD_DIR, 'training');

// Ensure upload directories exist
if (!fs.existsSync(TRAINING_DIR)) {
  fs.mkdirSync(TRAINING_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TRAINING_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ============================================================================
// TRAINING MODULES CRUD
// ============================================================================

/**
 * GET /api/training-modules
 * List all training modules
 */
router.get('/', async (req, res) => {
  try {
    const { category_id, company_id, status, search, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT
        tm.*,
        pc.name as category_name,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT COUNT(*) FROM training_lessons tl WHERE tl.module_id = tm.id) as lesson_count,
        (SELECT COUNT(*) FROM training_quizzes tq WHERE tq.module_id = tm.id) as quiz_count,
        (SELECT COUNT(*) FROM training_completions tc WHERE tc.module_id = tm.id) as completion_count
      FROM training_modules tm
      LEFT JOIN policy_categories pc ON tm.category_id = pc.id
      LEFT JOIN users u ON tm.created_by = u.id
      WHERE tm.tenant_id = $1 AND tm.deleted_at IS NULL
    `;
    const params = [req.tenant_id];

    if (category_id) {
      params.push(category_id);
      query += ` AND tm.category_id = $${params.length}`;
    }

    if (company_id) {
      params.push(company_id);
      query += ` AND (tm.company_id = $${params.length} OR tm.company_id IS NULL)`;
    }

    if (status) {
      params.push(status);
      query += ` AND tm.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (tm.title ILIKE $${params.length} OR tm.description ILIKE $${params.length})`;
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as filtered`, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY tm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Error fetching training modules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training modules' });
  }
});

/**
 * GET /api/training-modules/:id
 * Get module with lessons and quizzes
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const module = await pool.query(
      `SELECT tm.*, pc.name as category_name
       FROM training_modules tm
       LEFT JOIN policy_categories pc ON tm.category_id = pc.id
       WHERE tm.id = $1 AND tm.tenant_id = $2 AND tm.deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (module.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    // Get lessons
    const lessons = await pool.query(
      `SELECT * FROM training_lessons WHERE module_id = $1 ORDER BY sort_order ASC`,
      [id]
    );

    // Get quizzes with questions
    const quizzes = await pool.query(
      `SELECT * FROM training_quizzes WHERE module_id = $1 ORDER BY sort_order ASC`,
      [id]
    );

    const quizzesWithQuestions = await Promise.all(
      quizzes.rows.map(async (quiz) => {
        const questions = await pool.query(
          `SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY sort_order ASC`,
          [quiz.id]
        );
        return { ...quiz, questions: questions.rows };
      })
    );

    res.json({
      success: true,
      data: {
        ...module.rows[0],
        lessons: lessons.rows,
        quizzes: quizzesWithQuestions
      }
    });
  } catch (error) {
    console.error('Error fetching training module:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training module' });
  }
});

/**
 * POST /api/training-modules
 * Create a new training module
 */
router.post('/', async (req, res) => {
  try {
    const {
      category_id,
      company_id,
      title,
      description,
      objectives,
      estimated_duration_minutes = 30,
      passing_score = 70,
      max_attempts = 3,
      allow_skip = false,
      is_mandatory = true,
      prerequisites,
      new_hire_due_days = 30,
      renewal_frequency_months = 12,
      tags
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO training_modules (
        tenant_id, company_id, category_id, title, description, objectives,
        estimated_duration_minutes, passing_score, max_attempts, allow_skip,
        is_mandatory, prerequisites, new_hire_due_days, renewal_frequency_months, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        req.tenant_id,
        company_id || null,
        category_id || null,
        title,
        description || null,
        objectives || null,
        parseInt(estimated_duration_minutes),
        parseInt(passing_score),
        parseInt(max_attempts),
        allow_skip === true || allow_skip === 'true',
        is_mandatory === true || is_mandatory === 'true',
        prerequisites || null,
        parseInt(new_hire_due_days),
        parseInt(renewal_frequency_months),
        tags ? (typeof tags === 'string' ? tags.split(',') : tags) : null,
        req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating training module:', error);
    res.status(500).json({ success: false, error: 'Failed to create training module' });
  }
});

/**
 * PUT /api/training-modules/:id
 * Update a training module
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await pool.query(
      `SELECT * FROM training_modules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    const result = await pool.query(
      `UPDATE training_modules SET
        category_id = COALESCE($1, category_id),
        company_id = $2,
        title = COALESCE($3, title),
        description = $4,
        objectives = $5,
        estimated_duration_minutes = COALESCE($6, estimated_duration_minutes),
        passing_score = COALESCE($7, passing_score),
        max_attempts = COALESCE($8, max_attempts),
        allow_skip = COALESCE($9, allow_skip),
        is_mandatory = COALESCE($10, is_mandatory),
        prerequisites = $11,
        new_hire_due_days = COALESCE($12, new_hire_due_days),
        renewal_frequency_months = COALESCE($13, renewal_frequency_months),
        tags = $14,
        content_order = COALESCE($15, content_order),
        thumbnail_url = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17 AND tenant_id = $18
      RETURNING *`,
      [
        updates.category_id,
        updates.company_id || null,
        updates.title,
        updates.description,
        updates.objectives,
        updates.estimated_duration_minutes ? parseInt(updates.estimated_duration_minutes) : undefined,
        updates.passing_score ? parseInt(updates.passing_score) : undefined,
        updates.max_attempts ? parseInt(updates.max_attempts) : undefined,
        updates.allow_skip !== undefined ? updates.allow_skip : undefined,
        updates.is_mandatory !== undefined ? updates.is_mandatory : undefined,
        updates.prerequisites || null,
        updates.new_hire_due_days ? parseInt(updates.new_hire_due_days) : undefined,
        updates.renewal_frequency_months ? parseInt(updates.renewal_frequency_months) : undefined,
        updates.tags ? (typeof updates.tags === 'string' ? updates.tags.split(',') : updates.tags) : null,
        updates.content_order ? JSON.stringify(updates.content_order) : undefined,
        updates.thumbnail_url || null,
        id,
        req.tenant_id
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating training module:', error);
    res.status(500).json({ success: false, error: 'Failed to update training module' });
  }
});

/**
 * PUT /api/training-modules/:id/publish
 * Publish a training module
 */
router.put('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate module has content
    const lessons = await pool.query(`SELECT COUNT(*) FROM training_lessons WHERE module_id = $1`, [id]);

    if (parseInt(lessons.rows[0].count) === 0) {
      return res.status(400).json({ success: false, error: 'Module must have at least one lesson' });
    }

    const result = await pool.query(
      `UPDATE training_modules SET
        status = 'published',
        published_at = CURRENT_TIMESTAMP,
        published_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
      RETURNING *`,
      [req.user.id, id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Module published successfully' });
  } catch (error) {
    console.error('Error publishing module:', error);
    res.status(500).json({ success: false, error: 'Failed to publish module' });
  }
});

/**
 * DELETE /api/training-modules/:id
 * Soft delete a training module
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE training_modules SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ success: false, error: 'Failed to delete module' });
  }
});

// ============================================================================
// LESSONS CRUD
// ============================================================================

/**
 * POST /api/training-modules/:id/lessons
 * Add a lesson to a module
 */
router.post('/:id/lessons', upload.single('file'), async (req, res) => {
  try {
    const { id: moduleId } = req.params;
    const {
      title,
      description,
      lesson_type,
      content_html,
      video_url,
      video_provider,
      video_duration_seconds,
      is_required = true,
      min_view_time_seconds = 0,
      sort_order
    } = req.body;

    if (!title || !lesson_type) {
      return res.status(400).json({ success: false, error: 'Title and lesson_type are required' });
    }

    // Verify module exists
    const module = await pool.query(
      `SELECT id FROM training_modules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [moduleId, req.tenant_id]
    );

    if (module.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    // Get max sort_order
    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM training_lessons WHERE module_id = $1`,
      [moduleId]
    );

    let document_path = null;
    let actual_video_url = video_url;

    if (req.file) {
      if (lesson_type === 'video') {
        actual_video_url = `/uploads/training/${req.file.filename}`;
      } else {
        document_path = req.file.path;
      }
    }

    const result = await pool.query(
      `INSERT INTO training_lessons (
        module_id, title, description, lesson_type, content_html,
        video_url, video_provider, video_duration_seconds, document_path,
        is_required, min_view_time_seconds, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        moduleId,
        title,
        description || null,
        lesson_type,
        content_html || null,
        actual_video_url || null,
        video_provider || null,
        video_duration_seconds ? parseInt(video_duration_seconds) : null,
        document_path,
        is_required === true || is_required === 'true',
        parseInt(min_view_time_seconds) || 0,
        sort_order !== undefined ? parseInt(sort_order) : maxOrder.rows[0].next_order
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ success: false, error: 'Failed to create lesson' });
  }
});

/**
 * PUT /api/training-modules/:moduleId/lessons/:lessonId
 * Update a lesson
 */
router.put('/:moduleId/lessons/:lessonId', upload.single('file'), async (req, res) => {
  try {
    const { moduleId, lessonId } = req.params;
    const updates = req.body;

    // Verify lesson exists
    const existing = await pool.query(
      `SELECT tl.* FROM training_lessons tl
       JOIN training_modules tm ON tl.module_id = tm.id
       WHERE tl.id = $1 AND tl.module_id = $2 AND tm.tenant_id = $3`,
      [lessonId, moduleId, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    let document_path = existing.rows[0].document_path;
    let video_url = updates.video_url !== undefined ? updates.video_url : existing.rows[0].video_url;

    if (req.file) {
      if (updates.lesson_type === 'video' || existing.rows[0].lesson_type === 'video') {
        video_url = `/uploads/training/${req.file.filename}`;
      } else {
        document_path = req.file.path;
      }
    }

    const result = await pool.query(
      `UPDATE training_lessons SET
        title = COALESCE($1, title),
        description = $2,
        lesson_type = COALESCE($3, lesson_type),
        content_html = $4,
        video_url = $5,
        video_provider = $6,
        video_duration_seconds = $7,
        document_path = $8,
        is_required = COALESCE($9, is_required),
        min_view_time_seconds = COALESCE($10, min_view_time_seconds),
        sort_order = COALESCE($11, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        updates.title,
        updates.description,
        updates.lesson_type,
        updates.content_html,
        video_url,
        updates.video_provider,
        updates.video_duration_seconds ? parseInt(updates.video_duration_seconds) : null,
        document_path,
        updates.is_required !== undefined ? updates.is_required : undefined,
        updates.min_view_time_seconds ? parseInt(updates.min_view_time_seconds) : undefined,
        updates.sort_order !== undefined ? parseInt(updates.sort_order) : undefined,
        lessonId
      ]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ success: false, error: 'Failed to update lesson' });
  }
});

/**
 * DELETE /api/training-modules/:moduleId/lessons/:lessonId
 * Delete a lesson
 */
router.delete('/:moduleId/lessons/:lessonId', async (req, res) => {
  try {
    const { moduleId, lessonId } = req.params;

    const result = await pool.query(
      `DELETE FROM training_lessons
       WHERE id = $1 AND module_id = $2
       AND EXISTS (SELECT 1 FROM training_modules WHERE id = $2 AND tenant_id = $3)
       RETURNING id`,
      [lessonId, moduleId, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }

    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lesson' });
  }
});

// ============================================================================
// QUIZZES CRUD
// ============================================================================

/**
 * POST /api/training-modules/:id/quizzes
 * Add a quiz to a module
 */
router.post('/:id/quizzes', async (req, res) => {
  try {
    const { id: moduleId } = req.params;
    const {
      title,
      description,
      time_limit_minutes = 0,
      passing_score = 70,
      randomize_questions = false,
      show_correct_answers = false,
      questions_to_show = 0,
      sort_order
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    // Verify module exists
    const module = await pool.query(
      `SELECT id FROM training_modules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [moduleId, req.tenant_id]
    );

    if (module.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM training_quizzes WHERE module_id = $1`,
      [moduleId]
    );

    const result = await pool.query(
      `INSERT INTO training_quizzes (
        module_id, title, description, time_limit_minutes, passing_score,
        randomize_questions, show_correct_answers, questions_to_show, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        moduleId,
        title,
        description || null,
        parseInt(time_limit_minutes),
        parseInt(passing_score),
        randomize_questions === true || randomize_questions === 'true',
        show_correct_answers === true || show_correct_answers === 'true',
        parseInt(questions_to_show),
        sort_order !== undefined ? parseInt(sort_order) : maxOrder.rows[0].next_order
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to create quiz' });
  }
});

/**
 * PUT /api/training-modules/:moduleId/quizzes/:quizId
 * Update a quiz
 */
router.put('/:moduleId/quizzes/:quizId', async (req, res) => {
  try {
    const { moduleId, quizId } = req.params;
    const updates = req.body;

    const result = await pool.query(
      `UPDATE training_quizzes SET
        title = COALESCE($1, title),
        description = $2,
        time_limit_minutes = COALESCE($3, time_limit_minutes),
        passing_score = COALESCE($4, passing_score),
        randomize_questions = COALESCE($5, randomize_questions),
        show_correct_answers = COALESCE($6, show_correct_answers),
        questions_to_show = COALESCE($7, questions_to_show),
        sort_order = COALESCE($8, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND module_id = $10
      AND EXISTS (SELECT 1 FROM training_modules WHERE id = $10 AND tenant_id = $11)
      RETURNING *`,
      [
        updates.title,
        updates.description,
        updates.time_limit_minutes ? parseInt(updates.time_limit_minutes) : undefined,
        updates.passing_score ? parseInt(updates.passing_score) : undefined,
        updates.randomize_questions,
        updates.show_correct_answers,
        updates.questions_to_show ? parseInt(updates.questions_to_show) : undefined,
        updates.sort_order !== undefined ? parseInt(updates.sort_order) : undefined,
        quizId,
        moduleId,
        req.tenant_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to update quiz' });
  }
});

/**
 * DELETE /api/training-modules/:moduleId/quizzes/:quizId
 * Delete a quiz
 */
router.delete('/:moduleId/quizzes/:quizId', async (req, res) => {
  try {
    const { moduleId, quizId } = req.params;

    const result = await pool.query(
      `DELETE FROM training_quizzes
       WHERE id = $1 AND module_id = $2
       AND EXISTS (SELECT 1 FROM training_modules WHERE id = $2 AND tenant_id = $3)
       RETURNING id`,
      [quizId, moduleId, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to delete quiz' });
  }
});

// ============================================================================
// QUIZ QUESTIONS CRUD
// ============================================================================

/**
 * POST /api/training-modules/:moduleId/quizzes/:quizId/questions
 * Add a question to a quiz
 */
router.post('/:moduleId/quizzes/:quizId/questions', async (req, res) => {
  try {
    const { moduleId, quizId } = req.params;
    const {
      question_text,
      question_type,
      options,
      points = 1,
      explanation,
      sort_order
    } = req.body;

    if (!question_text || !question_type || !options) {
      return res.status(400).json({ success: false, error: 'question_text, question_type, and options are required' });
    }

    // Verify quiz exists
    const quiz = await pool.query(
      `SELECT tq.id FROM training_quizzes tq
       JOIN training_modules tm ON tq.module_id = tm.id
       WHERE tq.id = $1 AND tq.module_id = $2 AND tm.tenant_id = $3`,
      [quizId, moduleId, req.tenant_id]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM quiz_questions WHERE quiz_id = $1`,
      [quizId]
    );

    const result = await pool.query(
      `INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, points, explanation, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        quizId,
        question_text,
        question_type,
        JSON.stringify(options),
        parseInt(points),
        explanation || null,
        sort_order !== undefined ? parseInt(sort_order) : maxOrder.rows[0].next_order
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ success: false, error: 'Failed to create question' });
  }
});

/**
 * PUT /api/training-modules/:moduleId/quizzes/:quizId/questions/:questionId
 * Update a question
 */
router.put('/:moduleId/quizzes/:quizId/questions/:questionId', async (req, res) => {
  try {
    const { moduleId, quizId, questionId } = req.params;
    const updates = req.body;

    const result = await pool.query(
      `UPDATE quiz_questions SET
        question_text = COALESCE($1, question_text),
        question_type = COALESCE($2, question_type),
        options = COALESCE($3, options),
        points = COALESCE($4, points),
        explanation = $5,
        sort_order = COALESCE($6, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND quiz_id = $8
      AND EXISTS (
        SELECT 1 FROM training_quizzes tq
        JOIN training_modules tm ON tq.module_id = tm.id
        WHERE tq.id = $8 AND tq.module_id = $9 AND tm.tenant_id = $10
      )
      RETURNING *`,
      [
        updates.question_text,
        updates.question_type,
        updates.options ? JSON.stringify(updates.options) : undefined,
        updates.points ? parseInt(updates.points) : undefined,
        updates.explanation,
        updates.sort_order !== undefined ? parseInt(updates.sort_order) : undefined,
        questionId,
        quizId,
        moduleId,
        req.tenant_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ success: false, error: 'Failed to update question' });
  }
});

/**
 * DELETE /api/training-modules/:moduleId/quizzes/:quizId/questions/:questionId
 * Delete a question
 */
router.delete('/:moduleId/quizzes/:quizId/questions/:questionId', async (req, res) => {
  try {
    const { moduleId, quizId, questionId } = req.params;

    const result = await pool.query(
      `DELETE FROM quiz_questions
       WHERE id = $1 AND quiz_id = $2
       AND EXISTS (
         SELECT 1 FROM training_quizzes tq
         JOIN training_modules tm ON tq.module_id = tm.id
         WHERE tq.id = $2 AND tq.module_id = $3 AND tm.tenant_id = $4
       )
       RETURNING id`,
      [questionId, quizId, moduleId, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question' });
  }
});

/**
 * PUT /api/training-modules/:moduleId/lessons/reorder
 * Reorder lessons
 */
router.put('/:moduleId/lessons/reorder', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { order } = req.body; // Array of { id, sort_order }

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Order must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of order) {
        await client.query(
          `UPDATE training_lessons SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND module_id = $3`,
          [item.sort_order, item.id, moduleId]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Lessons reordered successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering lessons:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder lessons' });
  }
});

module.exports = router;
