import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Elasticsearch client
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  // auth: { username: 'elastic', password: 'changeme' } // Uncomment and add your credentials if needed
});

const INDEX_NAME = 'pe_linkedin'; // Adjust this to your specific index name if different
const OUTPUT_FILE = path.join(__dirname, '../es_dump.json');

async function dumpData() {
  console.log(`Starting to dump data from index: ${INDEX_NAME}`);
  
  try {
    // Check if index exists
    const indexExists = await client.indices.exists({ index: INDEX_NAME });
    if (!indexExists) {
      console.error(`Index ${INDEX_NAME} does not exist in the local Elasticsearch instance.`);
      process.exit(1);
    }

    const allRecords = [];
    
    // Initial search request using scroll API
    const response = await client.search({
      index: INDEX_NAME,
      scroll: '1m', // Keep the search context alive for 1 minute
      size: 1000,   // Number of documents per batch
      body: {
        query: {
          match_all: {}
        }
      }
    });

    let scrollId = response._scroll_id;
    let hits = response.hits.hits;

    while (hits && hits.length > 0) {
      // Add current batch to our collection
      for (const hit of hits) {
        allRecords.push({
          _id: hit._id,
          ...hit._source
        });
      }
      
      console.log(`Fetched ${allRecords.length} records so far...`);

      // Get next batch of results using the scroll ID
      const scrollResponse = await client.scroll({
        scroll_id: scrollId,
        scroll: '1m'
      });

      scrollId = scrollResponse._scroll_id;
      hits = scrollResponse.hits.hits;
    }

    // Write all collected records to a file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecords, null, 2));
    
    console.log(`\nSuccessfully dumped ${allRecords.length} records to ${OUTPUT_FILE}`);
    console.log(`You can now use this file to import the data into Supabase.`);
    
    // Clean up the scroll context
    await client.clearScroll({ scroll_id: scrollId });
    
  } catch (error) {
    console.error('An error occurred while dumping data:');
    if (error.meta && error.meta.body) {
      console.error(error.meta.body.error);
    } else {
      console.error(error);
    }
  }
}

dumpData();
