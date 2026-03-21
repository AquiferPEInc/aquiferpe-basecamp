import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client (Use Service Role Key for bypass RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mriyerznhngrgejlmtdx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

if (supabaseKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error("Please set VITE_SUPABASE_SERVICE_ROLE_KEY environment variable. You are missing your service role key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INPUT_FILE = path.join(__dirname, '../es_dump.json');
const BATCH_SIZE = 500; // Supabase recommended batch insert size


async function importData() {
  console.log(`Starting to read data from: ${INPUT_FILE}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Found ${data.length} records to import.`);
    
    // Process in batches
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const insertPayload = batch.map(record => ({
        name: record.name,
        about: record.about || null,
        current_position: record.current_position || null,
        experience: record.experience || null,
        education: record.education || null,
        license: record.license || null,
        state: record.state || null,
        location_name: record.location || null,
        linkedin_url: record.vanity ? `https://linkedin.com/in/${record.vanity}` : null
      }));

      console.log(`Inserting batch ${i} to ${i + batch.length}...`);
      
      const { error } = await supabase
        .from('freelancer')
        .insert(insertPayload);
        
      if (error) {
        console.error(`Error inserting batch ${i}:`, error);
        // Continue with other batches even if one fails
      } else {
        console.log(`Successfully inserted ${batch.length} records.`);
      }
    }
    
    console.log(`\nImport completed completely!`);
    
  } catch (error) {
    console.error('An error occurred while importing data:');
    console.error(error);
  }
}

importData();
