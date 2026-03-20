
import { db } from '../src/lib/database';

async function migrateActiveStatus() {
  try {
    console.log('Starting active_status migration...');

    // Add active_status column to client table
    const alterTableQuery = `
      ALTER TABLE client
      ADD COLUMN IF NOT EXISTS active_status VARCHAR(50) DEFAULT 'Active';
    `;

    await db.query(alterTableQuery);
    console.log('Added active_status column to client table.');

    // Backfill existing records if any have null (though DEFAULT handles new ones, existing ones get the default if NOT NULL is added, or NULL if nullable. Adding column with default usually updates existing rows in PG if not nullable, but here it is nullable. I'll update nulls to Active)
    const updateQuery = `
      UPDATE client
      SET active_status = 'Active'
      WHERE active_status IS NULL;
    `;
    await db.query(updateQuery);
    console.log('Backfilled active_status for existing clients.');

    console.log('Active status migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

migrateActiveStatus();
