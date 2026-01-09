const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const authenticateToken = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if user can edit a document
 */
const canEditDocument = async (req, docType, docId) => {
  const user = req.user;
  const userType = user.user_type || user.role;

  // Superadmin and consultant can edit all
  if (['superadmin', 'consultant'].includes(userType)) {
    return { allowed: true };
  }

  // Get document info
  let doc;
  if (docType === 'generated_document') {
    const result = await pool.query(
      'SELECT company_id, is_editable FROM generated_documents WHERE id = $1',
      [docId]
    );
    doc = result.rows[0];
  } else if (docType === 'onboarding_document') {
    const result = await pool.query(
      'SELECT company_id, is_editable FROM onboarding_documents WHERE id = $1',
      [docId]
    );
    doc = result.rows[0];
  }

  if (!doc) {
    return { allowed: false, error: 'Document not found' };
  }

  if (!doc.is_editable) {
    return { allowed: false, error: 'This document is not editable' };
  }

  // Check company access for company_admin and staff
  if (['company_admin', 'staff'].includes(userType)) {
    // Would need to check user's company access here
    // For now, allow if they have general access
    return { allowed: true };
  }

  return { allowed: false, error: 'You do not have permission to edit this document' };
};

// ============================================================================
// DOCUMENT EDITING
// ============================================================================

/**
 * GET /api/document-editor/:type/:id
 * Get a document for editing
 */
router.get('/:type/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type, id } = req.params;

    // Validate document type
    if (!['generated_document', 'onboarding_document'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid document type' });
    }

    // Check permissions
    const permission = await canEditDocument(req, type, id);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: permission.error });
    }

    let result;
    if (type === 'generated_document') {
      result = await pool.query(`
        SELECT gd.*, dt.name as template_name, dt.template_type,
               e.first_name || ' ' || e.last_name as employee_name
        FROM generated_documents gd
        LEFT JOIN document_templates dt ON gd.template_id = dt.id
        LEFT JOIN employees e ON gd.employee_id = e.id
        WHERE gd.id = $1 AND gd.tenant_id = $2
      `, [id, tenantId]);
    } else {
      result = await pool.query(`
        SELECT od.*, e.first_name || ' ' || e.last_name as employee_name
        FROM onboarding_documents od
        LEFT JOIN employees e ON od.employee_id = e.id
        WHERE od.id = $1 AND od.tenant_id = $2
      `, [id, tenantId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching document for editing:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document' });
  }
});

/**
 * PUT /api/document-editor/:type/:id
 * Save document edits (creates a new version)
 */
router.put('/:type/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userRole = req.user.user_type || req.user.role;
    const { type, id } = req.params;
    const { content, change_summary } = req.body;

    // Validate document type
    if (!['generated_document', 'onboarding_document'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid document type' });
    }

    // Check permissions
    const permission = await canEditDocument(req, type, id);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: permission.error });
    }

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    await client.query('BEGIN');

    // Get current document version
    let currentDoc;
    if (type === 'generated_document') {
      const result = await client.query(
        'SELECT current_version, content FROM generated_documents WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      currentDoc = result.rows[0];
    } else {
      const result = await client.query(
        'SELECT current_version, document_content as content FROM onboarding_documents WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      currentDoc = result.rows[0];
    }

    if (!currentDoc) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const newVersion = (currentDoc.current_version || 0) + 1;

    // Create version record (save the PREVIOUS content before update)
    if (currentDoc.content) {
      await client.query(`
        INSERT INTO document_versions (
          tenant_id, document_type, document_id, version_number,
          content_snapshot, change_summary, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        tenantId,
        type,
        id,
        currentDoc.current_version || 1,
        currentDoc.content,
        change_summary || 'Document updated',
        userId,
        userEmail
      ]);
    }

    // Update document
    let updateResult;
    if (type === 'generated_document') {
      updateResult = await client.query(`
        UPDATE generated_documents
        SET content = $1,
            current_version = $2,
            last_edited_by = $3,
            last_edited_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
        RETURNING *
      `, [content, newVersion, userId, id, tenantId]);
    } else {
      updateResult = await client.query(`
        UPDATE onboarding_documents
        SET document_content = $1,
            current_version = $2,
            last_edited_by = $3,
            last_edited_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
        RETURNING *
      `, [content, newVersion, userId, id, tenantId]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Document updated to version ${newVersion}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving document edits:', error);
    res.status(500).json({ success: false, error: 'Failed to save document' });
  } finally {
    client.release();
  }
});

// ============================================================================
// VERSION HISTORY
// ============================================================================

/**
 * GET /api/document-editor/:type/:id/versions
 * List all versions of a document
 */
router.get('/:type/:id/versions', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type, id } = req.params;

    // Validate document type
    if (!['generated_document', 'onboarding_document'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid document type' });
    }

    const result = await pool.query(`
      SELECT id, version_number, change_summary, created_by, created_by_name, created_at
      FROM document_versions
      WHERE document_type = $1 AND document_id = $2 AND tenant_id = $3
      ORDER BY version_number DESC
    `, [type, id, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch version history' });
  }
});

/**
 * GET /api/document-editor/:type/:id/versions/:versionId
 * Get a specific version of a document
 */
router.get('/:type/:id/versions/:versionId', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type, id, versionId } = req.params;

    const result = await pool.query(`
      SELECT *
      FROM document_versions
      WHERE id = $1 AND document_type = $2 AND document_id = $3 AND tenant_id = $4
    `, [versionId, type, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching version:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch version' });
  }
});

/**
 * POST /api/document-editor/:type/:id/versions/:versionId/restore
 * Restore a document to a specific version
 */
router.post('/:type/:id/versions/:versionId/restore', async (req, res) => {
  const client = await pool.connect();

  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { type, id, versionId } = req.params;

    // Check permissions
    const permission = await canEditDocument(req, type, id);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, error: permission.error });
    }

    // Get the version to restore
    const versionResult = await client.query(`
      SELECT content_snapshot, version_number
      FROM document_versions
      WHERE id = $1 AND document_type = $2 AND document_id = $3 AND tenant_id = $4
    `, [versionId, type, id, tenantId]);

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }

    const versionToRestore = versionResult.rows[0];

    await client.query('BEGIN');

    // Get current version number
    let currentDoc;
    if (type === 'generated_document') {
      const result = await client.query(
        'SELECT current_version, content FROM generated_documents WHERE id = $1',
        [id]
      );
      currentDoc = result.rows[0];
    } else {
      const result = await client.query(
        'SELECT current_version, document_content as content FROM onboarding_documents WHERE id = $1',
        [id]
      );
      currentDoc = result.rows[0];
    }

    const newVersion = (currentDoc.current_version || 0) + 1;

    // Save current state as a version before restoring
    if (currentDoc.content) {
      await client.query(`
        INSERT INTO document_versions (
          tenant_id, document_type, document_id, version_number,
          content_snapshot, change_summary, created_by, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        tenantId,
        type,
        id,
        currentDoc.current_version || 1,
        currentDoc.content,
        `Before restoring to version ${versionToRestore.version_number}`,
        userId,
        userEmail
      ]);
    }

    // Update document with restored content
    if (type === 'generated_document') {
      await client.query(`
        UPDATE generated_documents
        SET content = $1,
            current_version = $2,
            last_edited_by = $3,
            last_edited_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
      `, [versionToRestore.content_snapshot, newVersion, userId, id, tenantId]);
    } else {
      await client.query(`
        UPDATE onboarding_documents
        SET document_content = $1,
            current_version = $2,
            last_edited_by = $3,
            last_edited_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
      `, [versionToRestore.content_snapshot, newVersion, userId, id, tenantId]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Document restored to version ${versionToRestore.version_number}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error restoring version:', error);
    res.status(500).json({ success: false, error: 'Failed to restore version' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/document-editor/:type/:id/versions/:v1/diff/:v2
 * Compare two versions of a document
 */
router.get('/:type/:id/versions/:v1/diff/:v2', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type, id, v1, v2 } = req.params;

    const result = await pool.query(`
      SELECT id, version_number, content_snapshot, created_at, created_by_name
      FROM document_versions
      WHERE document_type = $1 AND document_id = $2 AND tenant_id = $3
        AND id IN ($4, $5)
      ORDER BY version_number
    `, [type, id, tenantId, v1, v2]);

    if (result.rows.length !== 2) {
      return res.status(404).json({ success: false, error: 'One or both versions not found' });
    }

    res.json({
      success: true,
      data: {
        version1: result.rows[0],
        version2: result.rows[1]
      }
    });
  } catch (error) {
    console.error('Error comparing versions:', error);
    res.status(500).json({ success: false, error: 'Failed to compare versions' });
  }
});

// ============================================================================
// DOCUMENT LOCK MANAGEMENT
// ============================================================================

/**
 * POST /api/document-editor/:type/:id/lock
 * Lock a document for editing
 */
router.post('/:type/:id/lock', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { type, id } = req.params;

    // For now, we'll use a simple flag in the document table
    // In a production system, you'd want a dedicated locks table with expiration

    if (type === 'generated_document') {
      await pool.query(`
        UPDATE generated_documents
        SET is_editable = false,
            last_edited_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [userId, id, tenantId]);
    } else {
      await pool.query(`
        UPDATE onboarding_documents
        SET is_editable = false,
            last_edited_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [userId, id, tenantId]);
    }

    res.json({ success: true, message: 'Document locked' });
  } catch (error) {
    console.error('Error locking document:', error);
    res.status(500).json({ success: false, error: 'Failed to lock document' });
  }
});

/**
 * DELETE /api/document-editor/:type/:id/lock
 * Unlock a document
 */
router.delete('/:type/:id/lock', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type, id } = req.params;

    if (type === 'generated_document') {
      await pool.query(`
        UPDATE generated_documents
        SET is_editable = true,
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);
    } else {
      await pool.query(`
        UPDATE onboarding_documents
        SET is_editable = true,
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);
    }

    res.json({ success: true, message: 'Document unlocked' });
  } catch (error) {
    console.error('Error unlocking document:', error);
    res.status(500).json({ success: false, error: 'Failed to unlock document' });
  }
});

module.exports = router;
