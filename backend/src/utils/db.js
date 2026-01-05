const { Pool } = require('pg');

// Support both DATABASE_URL (Render) and individual vars (Docker/local)
// Check if SSL should be disabled (for Docker/local PostgreSQL)
const dbUrl = process.env.DATABASE_URL || '';
const sslDisabled = dbUrl.includes('sslmode=disable');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslDisabled ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 5432,
      database: process.env.DATABASE_NAME || 'corehr_dev',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('CoreHR database connected');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
});

// Helper function for queries - binds to pool to avoid context issues
const queryFn = pool.query.bind(pool);

// Export pool as default for backward compatibility
// Files using `const pool = require('./db')` will get the pool
module.exports = pool;

// Also add named exports for new patterns
// Files using `const { query } = require('./db')` will get the query function
// Using Object.defineProperty to avoid overwriting pool's native query method
Object.defineProperty(module.exports, 'pool', {
  value: pool,
  writable: false,
  enumerable: true
});

Object.defineProperty(module.exports, 'query', {
  value: queryFn,
  writable: false,
  enumerable: true
});
