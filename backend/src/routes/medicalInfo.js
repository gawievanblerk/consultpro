const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const authenticateToken = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// MIDDLEWARE: HR-only access for viewing other employees' medical data
// ============================================================================

const requireHRAccess = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const userType = req.user.user_type;
    const userId = req.user.id;

    // Consultants and staff with admin roles can access all medical records
    if (userType === 'consultant' || userType === 'staff') {
      return next();
    }

    // Company admins can access their company's employees
    if (userType === 'company_admin') {
      const result = await pool.query(`
        SELECT e.id FROM employees e
        JOIN companies c ON e.company_id = c.id
        JOIN users u ON c.id = u.company_id
        WHERE e.id = $1 AND u.id = $2
      `, [employeeId, userId]);

      if (result.rows.length > 0) {
        return next();
      }
    }

    // Employees can only access their own medical info
    if (userType === 'employee') {
      const result = await pool.query(`
        SELECT id FROM employees WHERE id = $1 AND user_id = $2
      `, [employeeId, userId]);

      if (result.rows.length > 0) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied. You do not have permission to view this medical information.'
    });
  } catch (error) {
    console.error('HR access check error:', error);
    return res.status(500).json({ success: false, error: 'Access verification failed' });
  }
};

// ============================================================================
// MEDICAL INFO ROUTES
// ============================================================================

/**
 * GET /api/medical/:employeeId
 * Get employee medical information (HR or self only)
 */
router.get('/:employeeId', requireHRAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employeeId } = req.params;

    const result = await pool.query(`
      SELECT
        m.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        u.first_name || ' ' || u.last_name as last_updated_by_name
      FROM employee_medical_info m
      JOIN employees e ON m.employee_id = e.id
      LEFT JOIN users u ON m.last_updated_by = u.id
      WHERE m.employee_id = $1 AND m.tenant_id = $2
    `, [employeeId, tenantId]);

    if (result.rows.length === 0) {
      // Return empty record structure if not yet created
      return res.json({
        success: true,
        data: {
          employee_id: employeeId,
          blood_group: null,
          genotype: null,
          allergies: null,
          chronic_conditions: null,
          current_medications: null,
          emergency_medical_notes: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          emergency_contact_address: null,
          ndpa_consent_given: false,
          exists: false
        }
      });
    }

    res.json({ success: true, data: { ...result.rows[0], exists: true } });
  } catch (error) {
    console.error('Error fetching medical info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch medical information' });
  }
});

/**
 * PUT /api/medical/:employeeId
 * Update employee medical information
 */
router.put('/:employeeId', requireHRAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { employeeId } = req.params;
    const {
      blood_group,
      genotype,
      allergies,
      chronic_conditions,
      current_medications,
      emergency_medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      emergency_contact_address
    } = req.body;

    // Check if NDPA consent is given (required before storing medical data)
    const existingResult = await pool.query(`
      SELECT ndpa_consent_given FROM employee_medical_info
      WHERE employee_id = $1 AND tenant_id = $2
    `, [employeeId, tenantId]);

    // If record exists but no NDPA consent, and we're trying to add medical data
    if (existingResult.rows.length > 0 && !existingResult.rows[0].ndpa_consent_given) {
      const hasMedicalData = blood_group || genotype || allergies || chronic_conditions || current_medications || emergency_medical_notes;
      if (hasMedicalData) {
        return res.status(400).json({
          success: false,
          error: 'NDPA consent is required before storing medical information'
        });
      }
    }

    // Get employee's company_id
    const employeeResult = await pool.query(
      'SELECT company_id FROM employees WHERE id = $1 AND tenant_id = $2',
      [employeeId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const companyId = employeeResult.rows[0].company_id;

    // Upsert medical info
    const result = await pool.query(`
      INSERT INTO employee_medical_info (
        tenant_id, company_id, employee_id,
        blood_group, genotype, allergies, chronic_conditions,
        current_medications, emergency_medical_notes,
        emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, emergency_contact_address,
        last_updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        blood_group = COALESCE($4, employee_medical_info.blood_group),
        genotype = COALESCE($5, employee_medical_info.genotype),
        allergies = COALESCE($6, employee_medical_info.allergies),
        chronic_conditions = COALESCE($7, employee_medical_info.chronic_conditions),
        current_medications = COALESCE($8, employee_medical_info.current_medications),
        emergency_medical_notes = COALESCE($9, employee_medical_info.emergency_medical_notes),
        emergency_contact_name = COALESCE($10, employee_medical_info.emergency_contact_name),
        emergency_contact_phone = COALESCE($11, employee_medical_info.emergency_contact_phone),
        emergency_contact_relationship = COALESCE($12, employee_medical_info.emergency_contact_relationship),
        emergency_contact_address = COALESCE($13, employee_medical_info.emergency_contact_address),
        last_updated_by = $14,
        updated_at = NOW()
      RETURNING *
    `, [
      tenantId, companyId, employeeId,
      blood_group, genotype, allergies, chronic_conditions,
      current_medications, emergency_medical_notes,
      emergency_contact_name, emergency_contact_phone,
      emergency_contact_relationship, emergency_contact_address,
      userId
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating medical info:', error);
    res.status(500).json({ success: false, error: 'Failed to update medical information' });
  }
});

/**
 * POST /api/medical/:employeeId/ndpa-consent
 * Record NDPA consent for medical data storage
 */
router.post('/:employeeId/ndpa-consent', requireHRAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employeeId } = req.params;
    const { consent_given, onboarding_document_id } = req.body;

    if (consent_given !== true) {
      return res.status(400).json({
        success: false,
        error: 'Consent must be explicitly given (consent_given: true)'
      });
    }

    // Get employee's company_id
    const employeeResult = await pool.query(
      'SELECT company_id FROM employees WHERE id = $1 AND tenant_id = $2',
      [employeeId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const companyId = employeeResult.rows[0].company_id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Upsert consent
    const result = await pool.query(`
      INSERT INTO employee_medical_info (
        tenant_id, company_id, employee_id,
        ndpa_consent_given, ndpa_consent_at, ndpa_consent_ip,
        ndpa_consent_document_id
      ) VALUES ($1, $2, $3, true, NOW(), $4, $5)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        ndpa_consent_given = true,
        ndpa_consent_at = NOW(),
        ndpa_consent_ip = $4,
        ndpa_consent_document_id = COALESCE($5, employee_medical_info.ndpa_consent_document_id),
        updated_at = NOW()
      RETURNING *
    `, [tenantId, companyId, employeeId, ipAddress, onboarding_document_id || null]);

    res.json({
      success: true,
      message: 'NDPA consent recorded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error recording NDPA consent:', error);
    res.status(500).json({ success: false, error: 'Failed to record consent' });
  }
});

/**
 * GET /api/medical/emergency-contacts
 * Get emergency contacts for all employees (HR only, for emergency export)
 */
router.get('/emergency-contacts/list', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userType = req.user.user_type;
    const { company_id } = req.query;

    // Only HR roles can access this endpoint
    if (!['consultant', 'staff', 'company_admin'].includes(userType)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. HR access required.'
      });
    }

    let query = `
      SELECT
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.department,
        e.phone as employee_phone,
        m.emergency_contact_name,
        m.emergency_contact_phone,
        m.emergency_contact_relationship,
        m.emergency_contact_address,
        m.blood_group,
        m.allergies,
        c.legal_name as company_name
      FROM employees e
      LEFT JOIN employee_medical_info m ON e.id = m.employee_id
      JOIN companies c ON e.company_id = c.id
      WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.employment_status = 'active'
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND e.company_id = $${paramIdx++}`;
      params.push(company_id);
    }

    query += ' ORDER BY c.legal_name, e.last_name, e.first_name';

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch emergency contacts' });
  }
});

/**
 * GET /api/medical/my-info
 * Employee gets their own medical info (ESS endpoint)
 */
router.get('/my-info/details', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Get employee ID from user
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    const result = await pool.query(`
      SELECT * FROM employee_medical_info
      WHERE employee_id = $1 AND tenant_id = $2
    `, [employeeId, tenantId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          employee_id: employeeId,
          ndpa_consent_given: false,
          exists: false
        }
      });
    }

    res.json({ success: true, data: { ...result.rows[0], exists: true } });
  } catch (error) {
    console.error('Error fetching own medical info:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch medical information' });
  }
});

/**
 * PUT /api/medical/my-info
 * Employee updates their own medical info (ESS endpoint)
 */
router.put('/my-info/details', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;

    // Get employee ID from user
    const employeeResult = await pool.query(
      'SELECT id, company_id FROM employees WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [userId, tenantId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee record not found' });
    }

    const employeeId = employeeResult.rows[0].id;
    const companyId = employeeResult.rows[0].company_id;

    const {
      blood_group,
      genotype,
      allergies,
      chronic_conditions,
      current_medications,
      emergency_medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      emergency_contact_address
    } = req.body;

    // Check NDPA consent
    const consentResult = await pool.query(`
      SELECT ndpa_consent_given FROM employee_medical_info WHERE employee_id = $1
    `, [employeeId]);

    const hasMedicalData = blood_group || genotype || allergies || chronic_conditions || current_medications || emergency_medical_notes;

    if (hasMedicalData && (!consentResult.rows.length || !consentResult.rows[0].ndpa_consent_given)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide NDPA consent before adding medical information'
      });
    }

    const result = await pool.query(`
      INSERT INTO employee_medical_info (
        tenant_id, company_id, employee_id,
        blood_group, genotype, allergies, chronic_conditions,
        current_medications, emergency_medical_notes,
        emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, emergency_contact_address,
        last_updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        blood_group = COALESCE($4, employee_medical_info.blood_group),
        genotype = COALESCE($5, employee_medical_info.genotype),
        allergies = COALESCE($6, employee_medical_info.allergies),
        chronic_conditions = COALESCE($7, employee_medical_info.chronic_conditions),
        current_medications = COALESCE($8, employee_medical_info.current_medications),
        emergency_medical_notes = COALESCE($9, employee_medical_info.emergency_medical_notes),
        emergency_contact_name = COALESCE($10, employee_medical_info.emergency_contact_name),
        emergency_contact_phone = COALESCE($11, employee_medical_info.emergency_contact_phone),
        emergency_contact_relationship = COALESCE($12, employee_medical_info.emergency_contact_relationship),
        emergency_contact_address = COALESCE($13, employee_medical_info.emergency_contact_address),
        last_updated_by = $14,
        updated_at = NOW()
      RETURNING *
    `, [
      tenantId, companyId, employeeId,
      blood_group, genotype, allergies, chronic_conditions,
      current_medications, emergency_medical_notes,
      emergency_contact_name, emergency_contact_phone,
      emergency_contact_relationship, emergency_contact_address,
      userId
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating own medical info:', error);
    res.status(500).json({ success: false, error: 'Failed to update medical information' });
  }
});

module.exports = router;