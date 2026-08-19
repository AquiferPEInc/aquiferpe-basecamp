import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const ref = 'mriyerznhngrgejlmtdx';
const pass = process.env.DB_PASSWORD || 'aquiferpe1Success11!';

const regions = [
  'us-west-1', 'us-west-2', 'us-east-1', 'us-east-2',
  'ca-central-1', 'eu-west-1', 'ap-southeast-1'
];

async function addColumn() {
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    for (const port of [6543, 5432]) {
      const client = new pg.Client({
        host: host,
        port: port,
        database: 'postgres',
        user: `postgres.${ref}`,
        password: pass,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      try {
        await client.connect();
        console.log(`Connected to Supabase Pooler (${r}:${port})!`);
        await client.query('ALTER TABLE freelancer ADD COLUMN IF NOT EXISTS abstract TEXT;');
        console.log('Successfully added column "abstract" to "freelancer" table!');
        await client.end();
        return;
      } catch (err) {
        if (!err.message.includes('tenant/user') && !err.message.includes('ENOTFOUND')) {
          console.log(`Region ${r}:${port} error:`, err.message);
        }
      }
    }
  }
  console.log('Unable to reach pooler via auto-region check.');
}

addColumn();
