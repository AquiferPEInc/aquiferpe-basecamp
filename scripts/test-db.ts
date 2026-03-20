import { db } from '../src/lib/database'

async function testDatabaseConnection() {
  console.log('Testing database connection...')
  console.log('Configuration:')
  console.log(`- Host: ${process.env.DB_HOST || '192.168.86.100'}`)
  console.log(`- Port: ${process.env.DB_PORT || '5432'}`)
  console.log(`- Database: ${process.env.DB_NAME || 'aquifer'}`)
  console.log(`- User: ${process.env.DB_USER || 'aquifer_app'}`)
  console.log(`- Password: ${process.env.DB_PASSWORD ? '*** (set)' : 'NOT SET'}`)
  console.log()

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic connection test...')
    const isHealthy = await db.healthCheck()
    if (isHealthy) {
      console.log('✅ Database connection successful!')
    } else {
      console.log('❌ Database health check failed')
      process.exit(1)
    }
    console.log()

    // Test 2: Query database version
    console.log('Test 2: Query PostgreSQL version...')
    const versionResult = await db.query('SELECT version()')
    console.log(`✅ PostgreSQL version: ${versionResult.rows[0].version.split(',')[0]}`)
    console.log()

    // Test 3: List tables in the database
    console.log('Test 3: List tables in the database...')
    const tablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    if (tablesResult.rows.length > 0) {
      console.log(`✅ Found ${tablesResult.rows.length} table(s):`)
      tablesResult.rows.forEach((row: any, index: number) => {
        console.log(`  ${index + 1}. ${row.table_name}`)
      })
    } else {
      console.log('ℹ️ No tables found in the database')
    }
    console.log()

    // Test 4: Check if company table exists
    console.log('Test 4: Check for company table...')
    const companyTableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'company'
      )
    `)

    const companyTableExists = companyTableCheck.rows[0].exists
    if (companyTableExists) {
      console.log('✅ Company table exists')

      // Count rows in company table
      const countResult = await db.query('SELECT COUNT(*) as count FROM company')
      console.log(`  Rows in company table: ${countResult.rows[0].count}`)

      // Show table structure
      const columnsResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'company'
        ORDER BY ordinal_position
      `)

      console.log('  Table structure:')
      columnsResult.rows.forEach((row: any) => {
        console.log(`    - ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    } else {
      console.log('ℹ️ Company table does not exist')
      console.log('   Run the SQL in database/db.sql (adjusting for PostgreSQL syntax)')
    }
    console.log()

    // Test 5: Database statistics
    console.log('Test 5: Connection pool statistics...')
    const stats = db.getStats()
    console.log(`  Total connections: ${stats.totalCount}`)
    console.log(`  Idle connections: ${stats.idleCount}`)
    console.log(`  Waiting connections: ${stats.waitingCount}`)
    console.log()

    console.log('🎉 All database tests completed successfully!')

    // Close the connection pool
    await db.close()
    console.log('Database connection pool closed.')

  } catch (error: any) {
    console.error('❌ Database test failed:')
    console.error(`  Error: ${error.message}`)

    if (error.code) {
      console.error(`  Code: ${error.code}`)
    }

    if (error.host && error.port) {
      console.error(`  Connection: ${error.host}:${error.port}`)
    }

    console.error('\nTroubleshooting tips:')
    console.error('1. Check if PostgreSQL is running on 192.168.86.100:5432')
    console.error('2. Verify the password in .env file is correct')
    console.error('3. Check if user "aquifer_app" has access to database "aquifer"')
    console.error('4. Verify network connectivity to the database host')

    process.exit(1)
  }
}

// Run the test
testDatabaseConnection()