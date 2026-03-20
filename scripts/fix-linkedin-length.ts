
import { db } from '../src/lib/database';

async function fixLinkedinLength() {
  try {
    console.log('Starting linkedin length fix migration...');

    // Change linkedin column to TEXT
    const alterTableQuery = `
      ALTER TABLE client
      ALTER COLUMN linkedin TYPE TEXT;
    `;

    await db.query(alterTableQuery);
    console.log('Changed linkedin column to TEXT.');

    console.log('Linkedin length fix migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

fixLinkedinLength();
