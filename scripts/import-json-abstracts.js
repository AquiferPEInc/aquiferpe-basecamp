import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. The service role key is required to bypass RLS for this bulk update.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const JSON_DIR = '/Users/jz/webcrawler/linkedin/linkedin_user_profile/json';
const BATCH_SIZE = 100;

async function importAbstracts() {
  console.log(`Scanning JSON profiles directory: ${JSON_DIR}`);
  if (!fs.existsSync(JSON_DIR)) {
    console.error(`Directory not found: ${JSON_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json') && !f.startsWith('.'));
  console.log(`Found ${files.length} profile JSON files.`);

  const records = [];

  for (const file of files) {
    try {
      const filePath = path.join(JSON_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      const abstractText = (data.abstract || '').trim();
      if (abstractText) {
        const vanity = data.vanity || file.replace(/\.json$/, '');
        records.push({
          linkedin_url: `https://linkedin.com/in/${vanity}`,
          name: data.name || null,
          abstract: abstractText
        });
      }
    } catch (err) {
      console.warn(`Error reading file ${file}:`, err.message);
    }
  }

  console.log(`Profiles with a non-empty abstract: ${records.length} / ${files.length}`);

  let updatedCount = 0;
  let unmatchedCount = 0;
  let failedCount = 0;
  const unmatched = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(batch.map(async (record) => {
      const { data: updateData, error: updateError } = await supabase
        .from('freelancer')
        .update({ abstract: record.abstract })
        .eq('linkedin_url', record.linkedin_url)
        .select('id');

      if (updateError) {
        console.warn(`Update failed for ${record.linkedin_url}:`, updateError.message);
        return { status: 'failed' };
      }
      if (updateData && updateData.length > 0) {
        return { status: 'updated' };
      }

      if (record.name) {
        const { data: nameMatch, error: nameError } = await supabase
          .from('freelancer')
          .update({ abstract: record.abstract })
          .eq('name', record.name)
          .select('id');

        if (nameError) {
          console.warn(`Name-match update failed for ${record.name}:`, nameError.message);
          return { status: 'failed' };
        }
        if (nameMatch && nameMatch.length > 0) {
          return { status: 'updated' };
        }
      }

      return { status: 'unmatched', record };
    }));

    for (const r of results) {
      if (r.status === 'updated') updatedCount++;
      else if (r.status === 'failed') failedCount++;
      else {
        unmatchedCount++;
        unmatched.push(r.record.linkedin_url);
      }
    }

    if ((i + BATCH_SIZE) % 1000 === 0 || (i + BATCH_SIZE) >= records.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length} (Updated: ${updatedCount}, Unmatched: ${unmatchedCount}, Failed: ${failedCount})`);
    }
  }

  console.log(`\nImport abstracts completed!`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Unmatched (no existing freelancer row): ${unmatchedCount}`);
  console.log(`Failed: ${failedCount}`);
  if (unmatched.length > 0) {
    fs.writeFileSync(path.join(__dirname, 'unmatched-abstracts.json'), JSON.stringify(unmatched, null, 2));
    console.log(`Unmatched linkedin_urls written to scripts/unmatched-abstracts.json`);
  }
}

importAbstracts();
