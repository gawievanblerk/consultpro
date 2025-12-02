/**
 * Document Routes - CRM Module (Module 1.1)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// GET /api/documents - List all documents
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, entity_type, entity_id, document_type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE d.tenant_id = $1 AND d.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (entity_type) {
      whereClause += ` AND d.entity_type = $${paramIndex}`;
      params.push(entity_type);
      paramIndex++;
    }

    if (entity_id) {
      whereClause += ` AND d.entity_id = $${paramIndex}`;
      params.push(entity_id);
      paramIndex++;
    }

    if (document_type) {
      whereClause += ` AND d.document_type = $${paramIndex}`;
      params.push(document_type);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM documents d ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT d.* FROM documents d
       ${whereClause}
       ORDER BY d.created_at DESC
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
    console.error('List documents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Upload document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { entity_type, entity_id, document_type, description, tags } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({
        success: false,
        error: 'Entity type and entity ID are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO documents (
        id, tenant_id, entity_type, entity_id, document_type,
        file_name, file_path, file_size, mime_type, description, tags, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, req.tenant_id, entity_type, entity_id, document_type || 'other',
        req.file.originalname, req.file.path, req.file.size, req.file.mimetype,
        description, tags ? tags.split(',') : null, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = result.rows[0];
    res.download(doc.file_path, doc.file_name);

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, error: 'Failed to download document' });
  }
});

// DELETE /api/documents/:id - Soft delete document
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE documents SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

module.exports = router;
