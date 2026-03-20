
import { db } from '../src/lib/database';

async function migrateLinkedin() {
  try {
    console.log('Starting linkedin migration...');

    // Add linkedin column to client table
    const alterTableQuery = `
      ALTER TABLE client
      ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255);
    `;

    await db.query(alterTableQuery);
    console.log('Added linkedin column to client table.');

    console.log('Linkedin migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrateLinkedin();
