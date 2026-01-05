const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Directory for certificates
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CERTIFICATES_DIR = path.join(UPLOAD_DIR, 'certificates');

// Ensure certificates directory exists
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

// Generate unique verification code
function generateVerificationCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// List certificates for the tenant (admin view)
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { employee_id, module_id, search } = req.query;

    let whereClause = 'tm.tenant_id = $1';
    const params = [tenantId];
    let paramCount = 1;

    if (employee_id) {
      paramCount++;
      whereClause += ` AND ic.employee_id = $${paramCount}`;
      params.push(employee_id);
    }

    if (module_id) {
      paramCount++;
      whereClause += ` AND ic.module_id = $${paramCount}`;
      params.push(module_id);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR tm.title ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const certificates = await pool.query(`
      SELECT
        ic.id,
        ic.verification_code,
        ic.issued_at,
        ic.expires_at,
        ic.certificate_url,
        tm.id AS module_id,
        tm.title AS module_title,
        s.id AS employee_id,
        s.first_name,
        s.last_name,
        s.email,
        tc.score,
        ct.name AS template_name
      FROM issued_certificates ic
      JOIN training_modules tm ON ic.module_id = tm.id
      JOIN staff s ON ic.employee_id = s.id
      LEFT JOIN training_completions tc ON ic.completion_id = tc.id
      LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
      WHERE ${whereClause}
      ORDER BY ic.issued_at DESC
      LIMIT 100
    `, params);

    res.json({
      success: true,
      data: certificates.rows
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
});

// Get my certificates (employee view)
router.get('/my', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const userId = req.userId;

    // Get employee ID from user
    const employee = await pool.query(`
      SELECT s.id FROM staff s
      JOIN users u ON s.email = u.email
      WHERE u.id = $1 AND s.tenant_id = $2
    `, [userId, tenantId]);

    if (employee.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const employeeId = employee.rows[0].id;

    const certificates = await pool.query(`
      SELECT
        ic.id,
        ic.verification_code,
        ic.issued_at,
        ic.expires_at,
        ic.certificate_url,
        tm.title AS module_title,
        tm.description AS module_description,
        tc.score,
        tc.completed_at
      FROM issued_certificates ic
      JOIN training_modules tm ON ic.module_id = tm.id
      JOIN training_completions tc ON ic.completion_id = tc.id
      WHERE ic.employee_id = $1 AND tm.tenant_id = $2
      ORDER BY ic.issued_at DESC
    `, [employeeId, tenantId]);

    res.json({
      success: true,
      data: certificates.rows
    });
  } catch (error) {
    console.error('Error fetching my certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
});

// Verify certificate (public endpoint - no auth required for verification)
router.get('/verify/:code', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const { code } = req.params;

    const certificate = await pool.query(`
      SELECT
        ic.id,
        ic.verification_code,
        ic.issued_at,
        ic.expires_at,
        tm.title AS module_title,
        s.first_name,
        s.last_name,
        tc.score,
        tc.completed_at,
        CASE
          WHEN ic.expires_at IS NOT NULL AND ic.expires_at < NOW() THEN 'expired'
          ELSE 'valid'
        END AS status
      FROM issued_certificates ic
      JOIN training_modules tm ON ic.module_id = tm.id
      JOIN staff s ON ic.employee_id = s.id
      JOIN training_completions tc ON ic.completion_id = tc.id
      WHERE ic.verification_code = $1
    `, [code.toUpperCase()]);

    if (certificate.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
        valid: false
      });
    }

    const cert = certificate.rows[0];

    res.json({
      success: true,
      valid: cert.status === 'valid',
      data: {
        holder_name: `${cert.first_name} ${cert.last_name}`,
        module_title: cert.module_title,
        completion_date: cert.completed_at,
        issued_date: cert.issued_at,
        expires_date: cert.expires_at,
        score: cert.score,
        status: cert.status
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to verify certificate' });
  }
});

// Issue certificate manually (for admin)
router.post('/issue', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { completion_id, template_id, expires_in_days } = req.body;

    // Get completion details
    const completion = await pool.query(`
      SELECT
        tc.id,
        tc.employee_id,
        tc.module_id,
        tc.score,
        tm.title AS module_title,
        tm.certificate_template_id,
        s.first_name,
        s.last_name
      FROM training_completions tc
      JOIN training_modules tm ON tc.module_id = tm.id
      JOIN staff s ON tc.employee_id = s.id
      WHERE tc.id = $1 AND tm.tenant_id = $2
    `, [completion_id, tenantId]);

    if (completion.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Completion record not found' });
    }

    const comp = completion.rows[0];

    // Check if certificate already exists
    const existing = await pool.query(`
      SELECT id FROM issued_certificates WHERE completion_id = $1
    `, [completion_id]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Certificate already issued for this completion' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Calculate expiry date
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    // Create certificate record
    const result = await pool.query(`
      INSERT INTO issued_certificates (
        employee_id, module_id, completion_id, template_id,
        verification_code, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      comp.employee_id,
      comp.module_id,
      completion_id,
      template_id || comp.certificate_template_id,
      verificationCode,
      expiresAt
    ]);

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to issue certificate' });
  }
});

// Download certificate (generate PDF on the fly)
router.get('/:id/download', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Get certificate details
    const certificate = await pool.query(`
      SELECT
        ic.*,
        tm.title AS module_title,
        tm.description AS module_description,
        s.first_name,
        s.last_name,
        s.email,
        tc.score,
        tc.completed_at,
        ct.html_template
      FROM issued_certificates ic
      JOIN training_modules tm ON ic.module_id = tm.id
      JOIN staff s ON ic.employee_id = s.id
      JOIN training_completions tc ON ic.completion_id = tc.id
      LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
      WHERE ic.id = $1 AND tm.tenant_id = $2
    `, [id, tenantId]);

    if (certificate.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    const cert = certificate.rows[0];

    // Generate HTML certificate (simplified - in production would use puppeteer for PDF)
    const html = generateCertificateHTML(cert);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${cert.verification_code}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to download certificate' });
  }
});

// Revoke certificate
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { id } = req.params;

    // Verify certificate belongs to tenant
    const certificate = await pool.query(`
      SELECT ic.id FROM issued_certificates ic
      JOIN training_modules tm ON ic.module_id = tm.id
      WHERE ic.id = $1 AND tm.tenant_id = $2
    `, [id, tenantId]);

    if (certificate.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    await pool.query('DELETE FROM issued_certificates WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Certificate revoked'
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke certificate' });
  }
});

// Certificate templates management
router.get('/templates', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;

    const templates = await pool.query(`
      SELECT * FROM certificate_templates
      WHERE tenant_id = $1 OR is_system = true
      ORDER BY is_system DESC, name
    `, [tenantId]);

    res.json({
      success: true,
      data: templates.rows
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const pool = req.app.get('pool');
    const tenantId = req.tenantId;
    const { name, html_template } = req.body;

    const result = await pool.query(`
      INSERT INTO certificate_templates (tenant_id, name, html_template, is_system)
      VALUES ($1, $2, $3, false)
      RETURNING *
    `, [tenantId, name, html_template]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

// Helper function to generate certificate HTML
function generateCertificateHTML(cert) {
  // Use custom template if available, otherwise use default
  if (cert.html_template) {
    return cert.html_template
      .replace(/\{\{EMPLOYEE_NAME\}\}/g, `${cert.first_name} ${cert.last_name}`)
      .replace(/\{\{MODULE_TITLE\}\}/g, cert.module_title)
      .replace(/\{\{COMPLETION_DATE\}\}/g, new Date(cert.completed_at).toLocaleDateString())
      .replace(/\{\{ISSUE_DATE\}\}/g, new Date(cert.issued_at).toLocaleDateString())
      .replace(/\{\{SCORE\}\}/g, cert.score ? `${cert.score}%` : 'N/A')
      .replace(/\{\{VERIFICATION_CODE\}\}/g, cert.verification_code);
  }

  // Default certificate template
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Completion</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .certificate {
      width: 800px;
      background: white;
      border: 3px solid #1e3a5f;
      padding: 50px;
      text-align: center;
      position: relative;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      border: 1px solid #ddd;
    }
    .header {
      font-size: 14px;
      color: #666;
      letter-spacing: 4px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .title {
      font-size: 42px;
      color: #1e3a5f;
      margin-bottom: 20px;
      font-weight: normal;
    }
    .subtitle {
      font-size: 16px;
      color: #888;
      margin-bottom: 30px;
    }
    .recipient {
      font-size: 32px;
      color: #c17f24;
      margin: 30px 0;
      font-style: italic;
      border-bottom: 2px solid #c17f24;
      display: inline-block;
      padding-bottom: 5px;
    }
    .description {
      font-size: 18px;
      color: #444;
      margin: 20px 0;
      line-height: 1.6;
    }
    .course {
      font-size: 22px;
      color: #1e3a5f;
      font-weight: bold;
      margin: 15px 0;
    }
    .score {
      font-size: 16px;
      color: #666;
      margin: 10px 0;
    }
    .date {
      font-size: 14px;
      color: #888;
      margin-top: 30px;
    }
    .verification {
      position: absolute;
      bottom: 20px;
      right: 30px;
      font-size: 10px;
      color: #999;
    }
    .seal {
      width: 80px;
      height: 80px;
      border: 2px solid #c17f24;
      border-radius: 50%;
      margin: 30px auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #c17f24;
    }
    @media print {
      body { background: white; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">Certificate of Completion</div>
    <h1 class="title">CoreHR Learning</h1>
    <p class="subtitle">This is to certify that</p>
    <div class="recipient">${cert.first_name} ${cert.last_name}</div>
    <p class="description">has successfully completed the training course</p>
    <div class="course">${cert.module_title}</div>
    ${cert.score ? `<p class="score">with a score of ${cert.score}%</p>` : ''}
    <p class="date">Completed on ${new Date(cert.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <div class="seal">✓</div>
    <div class="verification">
      Verification Code: ${cert.verification_code}<br>
      Verify at: corehr.africa/verify/${cert.verification_code}
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = router;
