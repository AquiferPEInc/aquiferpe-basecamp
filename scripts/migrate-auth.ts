
import { db } from '../src/lib/database';

async function migrateAuth() {
  try {
    console.log('Starting auth migration...');

    // Create verification_codes table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS verification_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createTableQuery);
    console.log('Created verification_codes table.');

    console.log('Auth migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrateAuth();
