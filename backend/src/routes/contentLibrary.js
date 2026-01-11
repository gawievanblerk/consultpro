const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const authenticateToken = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// CONTENT LIBRARY CATEGORIES
// ============================================================================

/**
 * GET /api/content-library/categories
 * List all categories for the tenant
 */
router.get('/categories', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { company_id } = req.query;

    let query = `
      SELECT *
      FROM content_library_categories
      WHERE tenant_id = $1 AND is_active = true
    `;
    const params = [tenantId];

    if (company_id) {
      query += ` AND (company_id = $2 OR company_id IS NULL)`;
      params.push(company_id);
    }

    query += ` ORDER BY sort_order, name`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching content library categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/content-library/categories
 * Create a new category
 */
router.post('/categories', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { name, description, icon, company_id, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const result = await pool.query(`
      INSERT INTO content_library_categories (
        tenant_id, company_id, name, description, icon, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenantId, company_id || null, name, description, icon, sort_order || 0, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'A category with this name already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

/**
 * PUT /api/content-library/categories/:id
 * Update a category
 */
router.put('/categories/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const { name, description, icon, sort_order, is_active } = req.body;

    const result = await pool.query(`
      UPDATE content_library_categories
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          icon = COALESCE($3, icon),
          sort_order = COALESCE($4, sort_order),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [name, description, icon, sort_order, is_active, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

/**
 * DELETE /api/content-library/categories/:id
 * Delete a category (soft delete)
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    // Check if category has items
    const itemsCheck = await pool.query(
      'SELECT COUNT(*) FROM content_library_items WHERE category_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(itemsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with active items. Move or delete items first.'
      });
    }

    const result = await pool.query(`
      UPDATE content_library_categories
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// ============================================================================
// CONTENT LIBRARY ITEMS
// ============================================================================

/**
 * GET /api/content-library/items
 * List content library items with filters
 */
router.get('/items', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { company_id, category_id, content_type, search, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT i.*, c.name as category_name
      FROM content_library_items i
      LEFT JOIN content_library_categories c ON i.category_id = c.id
      WHERE i.tenant_id = $1 AND i.is_active = true
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND (i.company_id = $${paramIdx} OR i.company_id IS NULL)`;
      params.push(company_id);
      paramIdx++;
    }

    if (category_id) {
      query += ` AND i.category_id = $${paramIdx}`;
      params.push(category_id);
      paramIdx++;
    }

    if (content_type) {
      query += ` AND i.content_type = $${paramIdx}`;
      params.push(content_type);
      paramIdx++;
    }

    if (search) {
      query += ` AND (i.name ILIKE $${paramIdx} OR i.description ILIKE $${paramIdx} OR $${paramIdx + 1} = ANY(i.tags))`;
      params.push(`%${search}%`, search.toLowerCase());
      paramIdx += 2;
    }

    // Count total
    const countQuery = query.replace('SELECT i.*, c.name as category_name', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY i.usage_count DESC, i.name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching content library items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

/**
 * GET /api/content-library/items/:id
 * Get a single content library item
 */
router.get('/items/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT i.*, c.name as category_name
      FROM content_library_items i
      LEFT JOIN content_library_categories c ON i.category_id = c.id
      WHERE i.id = $1 AND i.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching content library item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch item' });
  }
});

/**
 * POST /api/content-library/items
 * Create a new content library item
 */
router.post('/items', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { name, description, content_type, content, category_id, company_id, tags } = req.body;

    // Validate required fields
    if (!name || !content_type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, content_type, and content are required'
      });
    }

    // Validate content_type
    const validTypes = ['job_description', 'kpi', 'task', 'clause', 'snippet', 'boilerplate'];
    if (!validTypes.includes(content_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await pool.query(`
      INSERT INTO content_library_items (
        tenant_id, company_id, category_id, name, description,
        content_type, content, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      tenantId,
      company_id || null,
      category_id || null,
      name,
      description,
      content_type,
      content,
      tags || [],
      userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating content library item:', error);
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
});

/**
 * PUT /api/content-library/items/:id
 * Update a content library item
 */
router.put('/items/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const { name, description, content_type, content, category_id, tags, is_active } = req.body;

    // Check if item exists and is not a system item
    const existingItem = await pool.query(
      'SELECT is_system FROM content_library_items WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (existingItem.rows[0].is_system) {
      return res.status(403).json({ success: false, error: 'System items cannot be modified' });
    }

    const result = await pool.query(`
      UPDATE content_library_items
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          content_type = COALESCE($3, content_type),
          content = COALESCE($4, content),
          category_id = COALESCE($5, category_id),
          tags = COALESCE($6, tags),
          is_active = COALESCE($7, is_active),
          version = version + 1,
          updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [name, description, content_type, content, category_id, tags, is_active, id, tenantId]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating content library item:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/content-library/items/:id
 * Delete a content library item (soft delete)
 */
router.delete('/items/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    // Check if item is a system item
    const existingItem = await pool.query(
      'SELECT is_system FROM content_library_items WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (existingItem.rows[0].is_system) {
      return res.status(403).json({ success: false, error: 'System items cannot be deleted' });
    }

    const result = await pool.query(`
      UPDATE content_library_items
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting content library item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

/**
 * POST /api/content-library/items/:id/duplicate
 * Duplicate a content library item
 */
router.post('/items/:id/duplicate', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    // Get original item
    const original = await pool.query(
      'SELECT * FROM content_library_items WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const item = original.rows[0];
    const newName = name || `${item.name} (Copy)`;

    const result = await pool.query(`
      INSERT INTO content_library_items (
        tenant_id, company_id, category_id, name, description,
        content_type, content, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      tenantId,
      item.company_id,
      item.category_id,
      newName,
      item.description,
      item.content_type,
      item.content,
      item.tags,
      userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error duplicating content library item:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate item' });
  }
});

/**
 * POST /api/content-library/items/:id/use
 * Increment usage count when item is inserted into a document
 */
router.post('/items/:id/use', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE content_library_items
      SET usage_count = usage_count + 1
      WHERE id = $1 AND tenant_id = $2
      RETURNING usage_count
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: { usage_count: result.rows[0].usage_count } });
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ success: false, error: 'Failed to update usage count' });
  }
});

/**
 * GET /api/content-library/search
 * Full-text search across content library
 */
router.get('/search', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { q, content_type, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }

    let query = `
      SELECT i.*, c.name as category_name
      FROM content_library_items i
      LEFT JOIN content_library_categories c ON i.category_id = c.id
      WHERE i.tenant_id = $1 AND i.is_active = true
        AND (
          i.name ILIKE $2
          OR i.description ILIKE $2
          OR i.content ILIKE $2
          OR $3 = ANY(i.tags)
        )
    `;
    const params = [tenantId, `%${q}%`, q.toLowerCase()];
    let paramIdx = 4;

    if (content_type) {
      query += ` AND i.content_type = $${paramIdx}`;
      params.push(content_type);
      paramIdx++;
    }

    query += ` ORDER BY i.usage_count DESC, i.name LIMIT $${paramIdx}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error searching content library:', error);
    res.status(500).json({ success: false, error: 'Failed to search' });
  }
});

/**
 * GET /api/content-library/types
 * Get available content types
 */
router.get('/types', async (req, res) => {
  const types = [
    { value: 'job_description', label: 'Job Description', icon: 'briefcase' },
    { value: 'kpi', label: 'KPI / Metric', icon: 'chart-bar' },
    { value: 'task', label: 'Task / Responsibility', icon: 'clipboard-list' },
    { value: 'clause', label: 'Contract Clause', icon: 'document-text' },
    { value: 'snippet', label: 'Policy Snippet', icon: 'shield-check' },
    { value: 'boilerplate', label: 'Boilerplate Text', icon: 'document-duplicate' }
  ];

  res.json({ success: true, data: types });
});

/**
 * POST /api/content-library/items/:id/apply-to-document
 * Apply a content library item to an onboarding document
 */
router.post('/items/:id/apply-to-document', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const { id } = req.params;
    const { onboarding_document_id } = req.body;

    if (!onboarding_document_id) {
      return res.status(400).json({ success: false, error: 'Onboarding document ID is required' });
    }

    await client.query('BEGIN');

    // Get the content library item
    const itemResult = await client.query(
      'SELECT * FROM content_library_items WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      [id, tenantId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Content library item not found' });
    }

    const item = itemResult.rows[0];

    // Get the onboarding document
    const docResult = await client.query(
      'SELECT * FROM onboarding_documents WHERE id = $1 AND tenant_id = $2',
      [onboarding_document_id, tenantId]
    );

    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Onboarding document not found' });
    }

    const doc = docResult.rows[0];

    // Store previous content for version history
    if (doc.document_content) {
      await client.query(`
        INSERT INTO document_versions (
          tenant_id, document_id, document_type, version_number,
          content, changed_by, change_summary
        ) VALUES ($1, $2, 'onboarding_document', COALESCE(
          (SELECT MAX(version_number) FROM document_versions WHERE document_id = $2), 0
        ) + 1, $3, $4, $5)
      `, [tenantId, onboarding_document_id, doc.document_content, userId, 'Content replaced from library']);
    }

    // Update the document with content from library
    const updateResult = await client.query(`
      UPDATE onboarding_documents
      SET document_content = $1,
          document_title = COALESCE($2, document_title),
          content_library_item_id = $3,
          updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [item.content, item.name, item.id, onboarding_document_id, tenantId]);

    // Increment usage count for the content library item
    await client.query(
      'UPDATE content_library_items SET usage_count = COALESCE(usage_count, 0) + 1, last_used_at = NOW() WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Content applied successfully',
      data: {
        document: updateResult.rows[0],
        content_item: item
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying content to document:', error);
    res.status(500).json({ success: false, error: 'Failed to apply content' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/content-library/items-for-document/:type
 * Get content library items suitable for a specific document type
 */
router.get('/items-for-document/:type', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type } = req.params;
    const { company_id } = req.query;

    // Map document types to content types
    const typeMapping = {
      'job_description': 'job_description',
      'org_chart': 'boilerplate',
      'key_contacts': 'boilerplate',
      'offer_letter': 'boilerplate',
      'employment_contract': 'clause',
      'nda': 'clause',
      'code_of_conduct': 'snippet'
    };

    const contentType = typeMapping[type] || 'boilerplate';

    let query = `
      SELECT i.*, c.name as category_name
      FROM content_library_items i
      LEFT JOIN content_library_categories c ON i.category_id = c.id
      WHERE i.tenant_id = $1 AND i.is_active = true
        AND (i.content_type = $2 OR i.content_type = 'boilerplate')
    `;
    const params = [tenantId, contentType];

    if (company_id) {
      query += ` AND (i.company_id = $3 OR i.company_id IS NULL)`;
      params.push(company_id);
    }

    query += ` ORDER BY i.usage_count DESC, i.name LIMIT 50`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching items for document:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

module.exports = router;