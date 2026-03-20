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

async function addPerformanceIndices() {
  try {
    console.log('Starting performance indices migration...');

    // 1. Communication reference_id
    console.log('Adding index on communication(reference_id)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_communication_reference_id ON communication(reference_id)');

    // 2. Campaign name
    console.log('Adding index on campaign(name)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_campaign_name ON campaign(name)');

    // 3. Campaign reference_id
    console.log('Adding index on campaign(reference_id)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_campaign_reference_id ON campaign(reference_id)');

    // 4. Client first_name
    console.log('Adding index on client(first_name)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_client_first_name ON client(first_name)');

    // 5. Client title
    console.log('Adding index on client(title)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_client_title ON client(title)');

    // 6. Client location
    console.log('Adding index on client(location)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_client_location ON client(location)');

    // 7. Company acec_chapter
    console.log('Adding index on company(acec_chapter)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_company_acec_chapter ON company(acec_chapter)');

    // 8. Company city
    console.log('Adding index on company(city)...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_company_city ON company(city)');

    console.log('Performance indices migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addPerformanceIndices();
