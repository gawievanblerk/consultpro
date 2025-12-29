#!/usr/bin/env node
/**
 * Database Migration Script
 * Run with: node scripts/migrate.js
 * Or: npm run migrate
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting migrations...');

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Get already executed migrations
    const { rows: executed } = await client.query(
      'SELECT name FROM _migrations'
    );
    const executedNames = new Set(executed.map(r => r.name));

    // Run pending migrations
    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${file} completed`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('All migrations completed successfully!');

  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
