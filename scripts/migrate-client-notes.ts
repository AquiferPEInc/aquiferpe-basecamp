
import { db } from '../src/lib/database';

async function migrateClientNotes() {
  try {
    console.log('Starting client notes migration...');

    // Add notes column to client table
    const alterTableQuery = `
      ALTER TABLE client
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `;

    await db.query(alterTableQuery);
    console.log('Added notes column to client table.');

    console.log('Client notes migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrateClientNotes();
