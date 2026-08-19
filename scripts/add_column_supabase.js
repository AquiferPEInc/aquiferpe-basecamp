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
  'ca-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'sa-east-1'
];

const databases = ['postgres', 'aquiferpe', 'aquifer'];

async function addColumn() {
  console.log('Testing poolers with username: postgres.mriyerznhngrgejlmtdx...');
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    for (const port of [6543, 5432]) {
      for (const dbName of databases) {
        const client = new pg.Client({
          host: host,
          port: port,
          database: dbName,
          user: `postgres.${ref}`,
          password: pass,
          ssl: {
            rejectUnauthorized: false,
            servername: `db.${ref}.supabase.co`
          },
          connectionTimeoutMillis: 2000
        });
        try {
          await client.connect();
          console.log(`SUCCESSFUL CONNECTION! Region: ${r}, Port: ${port}, DB: ${dbName}`);
          await client.query('ALTER TABLE freelancer ADD COLUMN IF NOT EXISTS abstract TEXT;');
          console.log('Successfully executed: ALTER TABLE freelancer ADD COLUMN IF NOT EXISTS abstract TEXT;');
          await client.end();
          return;
        } catch (err) {
          if (!err.message.includes('tenant/user') && !err.message.includes('ENOTFOUND') && !err.message.includes('timeout')) {
            console.log(`Region ${r}:${port} db ${dbName} message:`, err.message);
          }
        }
      }
    }
  }
  console.log('Finished scanning.');
}

addColumn();
