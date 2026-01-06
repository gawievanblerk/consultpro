#!/usr/bin/env node
/**
 * Cleanup Suspended Consultants
 * Deletes all suspended consultants and their related data
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function cleanup() {
  const client = await pool.connect();

  try {
    // Get suspended consultants
    const suspended = await client.query(`
      SELECT id, company_name, email
      FROM consultants
      WHERE subscription_status = 'suspended'
    `);

    console.log(`Found ${suspended.rows.length} suspended consultants to delete`);

    if (suspended.rows.length === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    for (const consultant of suspended.rows) {
      console.log(`\nDeleting: ${consultant.email} - ${consultant.company_name}`);

      await client.query('BEGIN');

      try {
        // Get company IDs for this consultant
        const companies = await client.query(
          'SELECT id FROM companies WHERE consultant_id = $1',
          [consultant.id]
        );
        const companyIds = companies.rows.map(c => c.id);

        if (companyIds.length > 0) {
          // Delete employee-related data
          await client.query(`DELETE FROM employee_salary_components WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ANY($1))`, [companyIds]);
          await client.query(`DELETE FROM employee_documents WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ANY($1))`, [companyIds]);
          await client.query(`DELETE FROM payslips WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ANY($1))`, [companyIds]);
          await client.query(`DELETE FROM leave_requests WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ANY($1))`, [companyIds]);
          await client.query(`DELETE FROM ess_invitations WHERE employee_id IN (SELECT id FROM employees WHERE company_id = ANY($1))`, [companyIds]);

          // Delete employees
          await client.query('DELETE FROM employees WHERE company_id = ANY($1)', [companyIds]);

          // Delete company-related data
          await client.query('DELETE FROM payroll_runs WHERE company_id = ANY($1)', [companyIds]);
          await client.query('DELETE FROM statutory_remittances WHERE company_id = ANY($1)', [companyIds]);
          await client.query('DELETE FROM company_salary_structures WHERE company_id = ANY($1)', [companyIds]);
          await client.query('DELETE FROM leave_policies WHERE company_id = ANY($1)', [companyIds]);

          // Delete companies
          await client.query('DELETE FROM companies WHERE consultant_id = $1', [consultant.id]);
        }

        // Delete consultant users
        await client.query('DELETE FROM consultant_users WHERE consultant_id = $1', [consultant.id]);

        // Delete invitations
        await client.query('DELETE FROM consultant_invitations WHERE email = $1', [consultant.email]);

        // Delete the consultant
        await client.query('DELETE FROM consultants WHERE id = $1', [consultant.id]);

        await client.query('COMMIT');
        console.log(`  ✓ Deleted successfully`);

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Failed: ${err.message}`);
      }
    }

    console.log('\nCleanup complete!');

  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
