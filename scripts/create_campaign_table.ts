import { db } from '../src/lib/database';

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS campaign (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      spreadsheet_id VARCHAR(255) NOT NULL,
      spreadsheet_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log('Creating campaign table...');
    await db.query(query);
    console.log('Campaign table created successfully.');
  } catch (error) {
    console.error('Error creating campaign table:', error);
  } finally {
    await db.close();
  }
}

createTable();
