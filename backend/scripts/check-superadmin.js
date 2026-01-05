#!/usr/bin/env node
/**
 * Check Superadmin Status
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function checkSuperadmin() {
  const client = await pool.connect();

  try {
    // Check if superadmins table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'superadmins'
      );
    `);
    console.log('Superadmins table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('ERROR: superadmins table does not exist! Migrations may not have run.');

      // Check what migrations have run
      const migrationsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '_migrations'
        );
      `);

      if (migrationsCheck.rows[0].exists) {
        const migrations = await client.query('SELECT name FROM _migrations ORDER BY name');
        console.log('Applied migrations:', migrations.rows.map(r => r.name));
      } else {
        console.log('No migrations table found - migrations have never run!');
      }
      return;
    }

    // List all superadmins
    const superadmins = await client.query('SELECT id, email, first_name, last_name, is_active, created_at FROM superadmins');
    console.log('Superadmins found:', superadmins.rows.length);

    if (superadmins.rows.length > 0) {
      superadmins.rows.forEach(sa => {
        console.log(`  - ${sa.email} (active: ${sa.is_active}, created: ${sa.created_at})`);
      });

      // Test password for first superadmin
      const sa = await client.query('SELECT * FROM superadmins WHERE email = $1', ['admin@corehr.africa']);
      if (sa.rows.length > 0) {
        const testPassword = 'CoreHR2024!';
        const isValid = await bcrypt.compare(testPassword, sa.rows[0].password_hash);
        console.log('Password test (CoreHR2024!):', isValid ? 'VALID' : 'INVALID');

        if (!isValid) {
          // Reset password
          console.log('Resetting password...');
          const newHash = await bcrypt.hash(testPassword, 10);
          await client.query('UPDATE superadmins SET password_hash = $1 WHERE email = $2', [newHash, 'admin@corehr.africa']);
          console.log('Password reset complete. Try logging in again.');
        }
      }
    } else {
      console.log('No superadmins exist. Creating one...');
      const email = 'admin@corehr.africa';
      const password = 'CoreHR2024!';
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(`
        INSERT INTO superadmins (email, password_hash, first_name, last_name, is_active)
        VALUES ($1, $2, $3, $4, true)
      `, [email, passwordHash, 'Platform', 'Admin']);

      console.log('Created superadmin: admin@corehr.africa / CoreHR2024!');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkSuperadmin().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
