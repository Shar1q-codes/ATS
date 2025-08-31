#!/usr/bin/env node

/**
 * Simple Database Connection Test
 *
 * This script tests the database connection to Supabase
 */

const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Create client with connection string
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test basic query
    console.log('🔍 Testing basic query...');
    const result = await client.query(
      'SELECT NOW() as current_time, version() as postgres_version',
    );
    console.log('✅ Query successful!');
    console.log(`⏰ Current time: ${result.rows[0].current_time}`);
    console.log(
      `🐘 PostgreSQL version: ${result.rows[0].postgres_version.split(' ')[0]}`,
    );

    // Check if extensions are available
    console.log('\n🔍 Checking required extensions...');
    const extensionsResult = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector')
      ORDER BY extname
    `);

    if (extensionsResult.rows.length > 0) {
      console.log('✅ Extensions found:');
      extensionsResult.rows.forEach((row) => {
        console.log(`  - ${row.extname} (version ${row.extversion})`);
      });
    } else {
      console.log(
        '⚠️  No required extensions found. You may need to enable them in Supabase.',
      );
    }

    // Check if any tables exist
    console.log('\n🔍 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ Existing tables:');
      tablesResult.rows.forEach((row) => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('📋 No tables found. Database is ready for initial setup.');
    }

    console.log('\n🎉 Database connection test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run migration:run');
    console.log('2. Verify schema: npm run schema:verify');
    console.log('3. Start the application: npm run start:dev');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`Error: ${error.message}`);

    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check your database password in the .env file');
      console.log(
        '2. Get the correct password from Supabase Dashboard > Settings > Database',
      );
      console.log("3. Make sure you're using the connection pooler URL");
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check your SUPABASE_URL in the .env file');
      console.log('2. Verify your project reference is correct');
      console.log('3. Make sure your internet connection is working');
    }
  } finally {
    await client.end();
  }
}

// Run the test
testConnection().catch(console.error);
