import { db } from '../src/lib/database';

async function migrate() {
  try {
    console.log("Adding 'verified' column to 'client' table...");
    await db.query("ALTER TABLE client ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;");
    console.log("Column added successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await db.close();
  }
}

migrate();
