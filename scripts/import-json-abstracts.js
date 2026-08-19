import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mriyerznhngrgejlmtdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("Missing Supabase API key in environment.");
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

  const recordsWithAbstract = [];

  for (const file of files) {
    try {
      const filePath = path.join(JSON_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      const abstractText = (data.abstract || data.about || '').trim();
      if (abstractText) {
        const vanity = data.vanity || file.replace(/\.json$/, '');
        recordsWithAbstract.push({
          linkedin_url: `https://linkedin.com/in/${vanity}`,
          vanity: vanity,
          name: data.name || null,
          about: abstractText,
          current_position: data.current_position || null,
          experience: data.experience || null,
          education: data.education || null,
          license: data.license || null,
          state: data.state || null,
          location_name: data.location || null
        });
      }
    } catch (err) {
      console.warn(`Error reading file ${file}:`, err.message);
    }
  }

  console.log(`Profiles with valid abstracts: ${recordsWithAbstract.length} / ${files.length}`);

  let updatedCount = 0;
  let insertedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recordsWithAbstract.length; i += BATCH_SIZE) {
    const batch = recordsWithAbstract.slice(i, i + BATCH_SIZE);
    
    // Process updates concurrently in small chunks to maximize speed
    const updatePromises = batch.map(async (record) => {
      // First try matching by linkedin_url
      const { data: updateData, error: updateError } = await supabase
        .from('freelancer')
        .update({ about: record.about })
        .eq('linkedin_url', record.linkedin_url)
        .select('id');

      if (!updateError && updateData && updateData.length > 0) {
        return { success: true, action: 'update' };
      }

      // If no record matched by linkedin_url, try matching by name
      if (record.name) {
        const { data: nameMatch, error: nameError } = await supabase
          .from('freelancer')
          .update({ about: record.about })
          .eq('name', record.name)
          .select('id');

        if (!nameError && nameMatch && nameMatch.length > 0) {
          return { success: true, action: 'update' };
        }
      }

      // If record still not found, insert it as a new freelancer
      const { error: insertError } = await supabase
        .from('freelancer')
        .insert({
          name: record.name,
          about: record.about,
          current_position: record.current_position,
          experience: record.experience,
          education: record.education,
          license: record.license,
          state: record.state,
          location_name: record.location_name,
          linkedin_url: record.linkedin_url
        });

      if (insertError) {
        console.warn(`Failed to update/insert record for ${record.linkedin_url}:`, insertError.message);
        return { success: false };
      }
      return { success: true, action: 'insert' };
    });

    const results = await Promise.all(updatePromises);
    const updates = results.filter(r => r.success && r.action === 'update').length;
    const inserts = results.filter(r => r.success && r.action === 'insert').length;
    
    updatedCount += updates;
    insertedCount += inserts;
    failedCount += (results.length - updates - inserts);

    if ((i + BATCH_SIZE) % 1000 === 0 || (i + BATCH_SIZE) >= recordsWithAbstract.length) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, recordsWithAbstract.length)} / ${recordsWithAbstract.length} (Updated: ${updatedCount}, Inserted: ${insertedCount}, Failed: ${failedCount})`);
    }
  }

  console.log(`\nImport abstracts completed!`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Failed: ${failedCount}`);
}

importAbstracts();
