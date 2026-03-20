import { db } from '../src/lib/database.ts';

async function addReferenceIdColumn() {
  try {
    console.log('Starting reference_id migration...');

    // Add reference_id column to communication table
    const alterTableQuery = `
      ALTER TABLE communication
      ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255) DEFAULT '';
    `;

    await db.query(alterTableQuery);
    console.log('Added reference_id column to communication table.');

    // Backfill existing records to ensure no nulls if needed, though DEFAULT '' handles new ones.
    // Existing rows will have null if we just add column without NOT NULL.
    // Let's set existing nulls to ''
    const updateQuery = `
      UPDATE communication
      SET reference_id = ''
      WHERE reference_id IS NULL;
    `;
    await db.query(updateQuery);
    console.log('Backfilled reference_id for existing communications.');

    console.log('Reference ID migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

addReferenceIdColumn();
