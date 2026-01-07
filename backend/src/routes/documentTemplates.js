const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Apply authentication to all routes
router.use(authenticateToken);

// Configure multer for template file uploads (PDFs, Word docs)
const uploadDir = path.join(__dirname, '../../uploads/templates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|html/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, Word documents, and HTML files are allowed'));
  }
});

// Standard placeholders available for templates
const STANDARD_PLACEHOLDERS = [
  { key: '{{employee_name}}', description: 'Full name (First + Last)' },
  { key: '{{employee_first_name}}', description: 'First name only' },
  { key: '{{employee_last_name}}', description: 'Last name only' },
  { key: '{{employee_email}}', description: 'Email address' },
  { key: '{{employee_number}}', description: 'Employee number' },
  { key: '{{job_title}}', description: 'Job title/position' },
  { key: '{{department}}', description: 'Department name' },
  { key: '{{hire_date}}', description: 'Hire/start date' },
  { key: '{{company_name}}', description: 'Company name' },
  { key: '{{salary}}', description: 'Basic salary amount' },
  { key: '{{manager_name}}', description: 'Line manager name' },
  { key: '{{current_date}}', description: 'Current date' },
  { key: '{{probation_end_date}}', description: 'Probation end date' }
];

// Template types for onboarding documents
const TEMPLATE_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter', category: 'onboarding' },
  { value: 'employment_contract', label: 'Employment Contract', category: 'onboarding' },
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)', category: 'onboarding' },
  { value: 'ndpa_consent', label: 'NDPA Data Protection Consent', category: 'onboarding' },
  { value: 'code_of_conduct', label: 'Code of Conduct', category: 'onboarding' },
  { value: 'job_description', label: 'Job Description Template', category: 'onboarding' },
  { value: 'org_chart', label: 'Organizational Chart', category: 'onboarding' },
  { value: 'key_contacts', label: 'Key Contacts & Escalation', category: 'onboarding' },
  { value: 'employee_handbook', label: 'Employee Handbook', category: 'policies' },
  { value: 'it_policy', label: 'IT Usage Policy', category: 'policies' },
  { value: 'leave_policy', label: 'Leave Policy', category: 'policies' },
  { value: 'confirmation_letter', label: 'Confirmation Letter', category: 'hr' },
  { value: 'warning_letter', label: 'Warning Letter', category: 'disciplinary' },
  { value: 'termination_letter', label: 'Termination Letter', category: 'exit' }
];

/**
 * GET /api/document-templates
 * List all document templates
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { category, template_type, is_active } = req.query;

    let query = `
      SELECT dt.*, u.email as created_by_email
      FROM document_templates dt
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE dt.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (category) {
      query += ` AND dt.category = $${paramIdx++}`;
      params.push(category);
    }
    if (template_type) {
      query += ` AND dt.template_type = $${paramIdx++}`;
      params.push(template_type);
    }
    if (is_active !== undefined) {
      query += ` AND dt.is_active = $${paramIdx++}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY dt.category, dt.template_type, dt.name';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        templateTypes: TEMPLATE_TYPES,
        placeholders: STANDARD_PLACEHOLDERS
      }
    });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/document-templates/types
 * Get available template types and placeholders
 */
router.get('/types', async (req, res) => {
  res.json({
    success: true,
    data: {
      types: TEMPLATE_TYPES,
      placeholders: STANDARD_PLACEHOLDERS
    }
  });
});

/**
 * GET /api/document-templates/:id
 * Get single template
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT dt.*, u.email as created_by_email
      FROM document_templates dt
      LEFT JOIN users u ON dt.created_by = u.id
      WHERE dt.id = $1 AND dt.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

/**
 * POST /api/document-templates
 * Create new template
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const userId = req.user.id;
    const {
      name,
      description,
      template_type,
      category,
      content,
      placeholders,
      company_id,
      is_active = true
    } = req.body;

    if (!name || !template_type || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, template_type, and content are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO document_templates (
        tenant_id, company_id, name, description, template_type, category,
        content, placeholders, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId,
      company_id || null,
      name,
      description,
      template_type,
      category || 'general',
      content,
      JSON.stringify(placeholders || STANDARD_PLACEHOLDERS),
      is_active,
      userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

/**
 * PUT /api/document-templates/:id
 * Update template
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const {
      name,
      description,
      template_type,
      category,
      content,
      placeholders,
      is_active
    } = req.body;

    // Check if template exists and is not a system template
    const existing = await pool.query(
      'SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    if (existing.rows[0].is_system_template) {
      return res.status(403).json({ success: false, error: 'Cannot modify system templates' });
    }

    const result = await pool.query(`
      UPDATE document_templates
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          template_type = COALESCE($3, template_type),
          category = COALESCE($4, category),
          content = COALESCE($5, content),
          placeholders = COALESCE($6, placeholders),
          is_active = COALESCE($7, is_active),
          version = version + 1,
          updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [
      name,
      description,
      template_type,
      category,
      content,
      placeholders ? JSON.stringify(placeholders) : null,
      is_active,
      id,
      tenantId
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/document-templates/:id
 * Delete template (soft delete by setting is_active = false, or hard delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const { hard = false } = req.query;

    // Check if template exists and is not a system template
    const existing = await pool.query(
      'SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    if (existing.rows[0].is_system_template) {
      return res.status(403).json({ success: false, error: 'Cannot delete system templates' });
    }

    if (hard === 'true') {
      await pool.query(
        'DELETE FROM document_templates WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
    } else {
      await pool.query(
        'UPDATE document_templates SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

/**
 * POST /api/document-templates/:id/upload
 * Upload a file attachment for a template (PDF version)
 */
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Check template exists
    const existing = await pool.query(
      'SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Store file path in template (add file_path column if needed via content JSON)
    const fileUrl = `/uploads/templates/${req.file.filename}`;

    // Update template with file info in a JSON field or separate columns
    // For now, we'll store in the content as a reference
    const result = await pool.query(`
      UPDATE document_templates
      SET placeholders = placeholders || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [
      JSON.stringify({
        attached_file: {
          path: fileUrl,
          original_name: req.file.originalname,
          size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_at: new Date().toISOString()
        }
      }),
      id,
      tenantId
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      file: {
        path: fileUrl,
        name: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading template file:', error);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

/**
 * POST /api/document-templates/:id/preview
 * Preview template with sample data
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { id } = req.params;
    const { employee_id } = req.body;

    // Get template
    const templateResult = await pool.query(
      'SELECT * FROM document_templates WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    let content = template.content;

    // If employee_id provided, replace placeholders with real data
    if (employee_id) {
      const empResult = await pool.query(`
        SELECT e.*, c.trading_name as company_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN companies c ON e.company_id = c.id
        LEFT JOIN employees m ON e.reports_to = m.id
        WHERE e.id = $1
      `, [employee_id]);

      if (empResult.rows.length > 0) {
        const emp = empResult.rows[0];
        const replacements = {
          '{{employee_name}}': `${emp.first_name} ${emp.last_name}`,
          '{{employee_first_name}}': emp.first_name,
          '{{employee_last_name}}': emp.last_name,
          '{{employee_email}}': emp.email,
          '{{employee_number}}': emp.employee_number || 'N/A',
          '{{job_title}}': emp.job_title || 'N/A',
          '{{department}}': emp.department || 'N/A',
          '{{hire_date}}': emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : 'N/A',
          '{{company_name}}': emp.company_name || 'N/A',
          '{{salary}}': emp.basic_salary ? `NGN ${Number(emp.basic_salary).toLocaleString()}` : 'As per offer',
          '{{manager_name}}': emp.manager_name || 'N/A',
          '{{current_date}}': new Date().toLocaleDateString(),
          '{{probation_end_date}}': emp.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString() : 'N/A'
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
          content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
        }
      }
    } else {
      // Replace with sample data
      const sampleReplacements = {
        '{{employee_name}}': 'John Doe',
        '{{employee_first_name}}': 'John',
        '{{employee_last_name}}': 'Doe',
        '{{employee_email}}': 'john.doe@example.com',
        '{{employee_number}}': 'EMP001',
        '{{job_title}}': 'Software Engineer',
        '{{department}}': 'Engineering',
        '{{hire_date}}': new Date().toLocaleDateString(),
        '{{company_name}}': 'Sample Company Ltd',
        '{{salary}}': 'NGN 500,000',
        '{{manager_name}}': 'Jane Manager',
        '{{current_date}}': new Date().toLocaleDateString(),
        '{{probation_end_date}}': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

      for (const [placeholder, value] of Object.entries(sampleReplacements)) {
        content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
    }

    res.json({
      success: true,
      data: {
        name: template.name,
        type: template.template_type,
        content
      }
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ success: false, error: 'Failed to preview template' });
  }
});

/**
 * GET /api/document-templates/by-type/:type
 * Get active template by type (for onboarding use)
 */
router.get('/by-type/:type', async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.user?.org;
    const { type } = req.params;
    const { company_id } = req.query;

    // Try company-specific template first, then tenant-wide
    let query = `
      SELECT * FROM document_templates
      WHERE tenant_id = $1 AND template_type = $2 AND is_active = true
    `;
    const params = [tenantId, type];

    if (company_id) {
      query += ` AND (company_id = $3 OR company_id IS NULL)
                 ORDER BY company_id NULLS LAST LIMIT 1`;
      params.push(company_id);
    } else {
      query += ` ORDER BY company_id NULLS LAST LIMIT 1`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No active template found for this type' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching template by type:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

module.exports = router;
