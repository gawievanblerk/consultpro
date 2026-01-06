#!/usr/bin/env node
/**
 * Create Super Admin Account
 * Run with: node scripts/create-superadmin.js
 *
 * This script creates a superadmin if one doesn't exist.
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function createSuperadmin() {
  const client = await pool.connect();

  try {
    // Check if superadmin exists
    const existing = await client.query('SELECT id, email FROM superadmins LIMIT 1');

    if (existing.rows.length > 0) {
      console.log('Superadmin already exists:', existing.rows[0].email);
      console.log('Login at: https://corehr.africa/superadmin/login');
      return;
    }

    // Create superadmin
    const email = 'admin@corehr.africa';
    const password = 'CoreHR2024!';  // Change this after first login!
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(`
      INSERT INTO superadmins (email, password_hash, first_name, last_name, is_active)
      VALUES ($1, $2, $3, $4, true)
    `, [email, passwordHash, 'Platform', 'Admin']);

    console.log('');
    console.log('='.repeat(50));
    console.log('SUPERADMIN CREATED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log('');
    console.log('Email:    ', email);
    console.log('Password: ', password);
    console.log('');
    console.log('Login at: https://corehr.africa/superadmin/login');
    console.log('');
    console.log('IMPORTANT: Change this password after first login!');
    console.log('='.repeat(50));

  } finally {
    client.release();
    await pool.end();
  }
}

createSuperadmin().catch(err => {
  console.error('Failed to create superadmin:', err);
  process.exit(1);
});
