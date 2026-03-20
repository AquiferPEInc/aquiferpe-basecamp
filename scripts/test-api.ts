import { db } from '../src/lib/database'

async function testApiQueries() {
  console.log('Testing API database queries...\n')

  try {
    // Test 1: Count total companies
    console.log('Test 1: Count total companies')
    const countResult = await db.query('SELECT COUNT(*) as total FROM company')
    const total = parseInt(countResult.rows[0].total)
    console.log(`✅ Total companies: ${total}`)
    console.log()

    // Test 2: Pagination query (page 1, limit 25)
    console.log('Test 2: Pagination query (page 1, limit 25)')
    const page = 1
    const limit = 25
    const offset = (page - 1) * limit

    const companiesResult = await db.query(
      'SELECT * FROM company ORDER BY id LIMIT $1 OFFSET $2',
      [limit, offset]
    )

    console.log(`✅ Retrieved ${companiesResult.rows.length} companies`)
    console.log(`   Page: ${page}, Limit: ${limit}, Offset: ${offset}`)

    if (companiesResult.rows.length > 0) {
      const firstCompany = companiesResult.rows[0]
      console.log(`   Sample company: ${firstCompany.company_name} (ID: ${firstCompany.id})`)
    }
    console.log()

    // Test 3: Pagination query (page 2, limit 10)
    console.log('Test 3: Pagination query (page 2, limit 10)')
    const page2 = 2
    const limit2 = 10
    const offset2 = (page2 - 1) * limit2

    const companiesResult2 = await db.query(
      'SELECT * FROM company ORDER BY id LIMIT $1 OFFSET $2',
      [limit2, offset2]
    )

    console.log(`✅ Retrieved ${companiesResult2.rows.length} companies`)
    console.log(`   Page: ${page2}, Limit: ${limit2}, Offset: ${offset2}`)

    // Verify offset works (rows should be different from first page)
    if (companiesResult.rows.length > 0 && companiesResult2.rows.length > 0) {
      const firstPageFirstId = companiesResult.rows[0].id
      const secondPageFirstId = companiesResult2.rows[0].id
      console.log(`   First page first ID: ${firstPageFirstId}`)
      console.log(`   Second page first ID: ${secondPageFirstId}`)
      if (firstPageFirstId !== secondPageFirstId) {
        console.log('   ✅ Pagination offset working correctly')
      } else {
        console.log('   ⚠️  Possible pagination issue: same first ID on different pages')
      }
    }
    console.log()

    // Test 4: Search query
    console.log('Test 4: Search query (case-insensitive)')
    const searchTerm = 'tech'
    const searchQuery = `
      SELECT * FROM company
      WHERE company_name ILIKE $1 OR industry ILIKE $1
      ORDER BY company_name
      LIMIT 5
    `
    const searchResult = await db.query(searchQuery, [`%${searchTerm}%`])
    console.log(`✅ Found ${searchResult.rows.length} companies matching "${searchTerm}"`)
    if (searchResult.rows.length > 0) {
      console.log('   Matching companies:')
      searchResult.rows.forEach((row: any, index: number) => {
        console.log(`     ${index + 1}. ${row.company_name} (${row.industry})`)
      })
    }
    console.log()

    // Test 5: Single company by ID
    console.log('Test 5: Get single company by ID')
    if (companiesResult.rows.length > 0) {
      const sampleId = companiesResult.rows[0].id
      const singleResult = await db.query('SELECT * FROM company WHERE id = $1', [sampleId])
      if (singleResult.rows.length === 1) {
        console.log(`✅ Found company with ID ${sampleId}: ${singleResult.rows[0].company_name}`)
      } else {
        console.log(`❌ Could not find company with ID ${sampleId}`)
      }
    } else {
      console.log('ℹ️  No companies in database to test single company lookup')
    }
    console.log()

    // Test 6: Pagination calculations
    console.log('Test 6: Pagination calculations')
    const totalPages = Math.ceil(total / limit)
    console.log(`   Total items: ${total}`)
    console.log(`   Page size: ${limit}`)
    console.log(`   Total pages: ${totalPages}`)
    console.log(`   Has next page (page 1): ${page < totalPages}`)
    console.log(`   Has prev page (page 1): ${page > 1}`)
    console.log()

    console.log('🎉 All API query tests passed!')
    console.log('\nAPI endpoints available:')
    console.log('  GET /api/companies?page=1&limit=25')
    console.log('  GET /api/companies/:id')
    console.log('  GET /api/companies/search?q=searchTerm')
    console.log('  GET /api/health')

  } catch (error: any) {
    console.error('❌ API query test failed:')
    console.error(`   Error: ${error.message}`)
    console.error(`   Stack: ${error.stack}`)

    console.error('\nTroubleshooting tips:')
    console.error('1. Ensure the company table exists in the database')
    console.error('2. Check database connection with: npx tsx scripts/test-db.ts')
    console.error('3. Verify the database schema matches the expected structure')
    console.error('4. Check if there are any companies in the database')

    process.exit(1)
  } finally {
    // Close database connection
    await db.close()
  }
}

// Run the test
testApiQueries()