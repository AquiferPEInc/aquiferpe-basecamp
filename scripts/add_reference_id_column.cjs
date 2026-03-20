const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '192.168.86.100',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'aquifer',
  user: process.env.DB_USER || 'aquifer_app',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
});

async function addReferenceIdColumn() {
  try {
    console.log('Starting reference_id migration...');

    // Add reference_id column to communication table
    const alterTableQuery = `
      ALTER TABLE communication
      ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255) DEFAULT '';
    `;

    await pool.query(alterTableQuery);
    console.log('Added reference_id column to communication table.');

    // Backfill
    const updateQuery = `
      UPDATE communication
      SET reference_id = ''
      WHERE reference_id IS NULL;
    `;
    await pool.query(updateQuery);
    console.log('Backfilled reference_id for existing communications.');

    console.log('Reference ID migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addReferenceIdColumn();
