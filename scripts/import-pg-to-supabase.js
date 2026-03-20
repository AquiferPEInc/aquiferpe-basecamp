import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mriyerznhngrgejlmtdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Missing VITE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrateTable(tableName) {
  console.log(`Migrating ${tableName}...`);
  const res = await pool.query(`SELECT * FROM ${tableName}`);
  const records = res.rows;
  
  if (records.length === 0) {
    console.log(`No records found for ${tableName}.`);
    return;
  }
  
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // We use .upsert() so that if we run the script multiple times 
    // it won't duplicate records or violate constraint
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error migrating ${tableName} batch ${i}:`, error.message);
    } else {
      console.log(`Upserted ${batch.length} records into ${tableName}.`);
    }
  }
}

async function run() {
  try {
    await migrateTable('company');
    await migrateTable('client');
    await migrateTable('communication');
    await migrateTable('campaign');
    console.log('Postgres migration complete.');
  } catch (error) {
    console.error('Migration failed', error);
  } finally {
    await pool.end();
  }
}

run();
