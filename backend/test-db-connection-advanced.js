#!/usr/bin/env node

/**
 * Advanced Database Connection Test
 *
 * This script tests multiple connection methods to Supabase
 */

const { Client } = require('pg');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const lookup = promisify(dns.lookup);

async function testDNSResolution() {
  console.log('🔍 Testing DNS resolution...');

  try {
    const hostname = process.env.DB_HOST;
    console.log(`   Resolving: ${hostname}`);

    const result = await lookup(hostname, { family: 4 }); // Force IPv4
    console.log(`✅ DNS resolved to IPv4: ${result.address}`);
    return result.address;
  } catch (error) {
    console.error(`❌ DNS resolution failed: ${error.message}`);
    return null;
  }
}

async function testConnection() {
  console.log('🚀 Advanced Database Connection Test\n');

  // Test DNS first
  const ipAddress = await testDNSResolution();

  // Connection configurations to try
  const connectionConfigs = [
    {
      name: 'Direct connection with resolved IP',
      config: ipAddress
        ? {
            host: ipAddress,
            port: parseInt(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 15000,
          }
        : null,
    },
    {
      name: 'Direct connection with hostname',
      config: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      },
    },
    {
      name: 'Connection string method',
      config: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      },
    },
  ];

  for (const { name, config } of connectionConfigs) {
    if (!config) continue;

    console.log(`\n📡 Trying: ${name}`);

    if (config.host) {
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   User: ${config.user}`);
    } else {
      const maskedUrl = config.connectionString.replace(/:[^:@]*@/, ':****@');
      console.log(`   URL: ${maskedUrl}`);
    }

    const client = new Client(config);

    try {
      console.log('   Connecting...');
      await client.connect();
      console.log('   ✅ Connected successfully!');

      // Test basic query
      console.log('   🔍 Testing query...');
      const result = await client.query(
        'SELECT NOW() as current_time, version() as postgres_version',
      );
      console.log('   ✅ Query successful!');
      console.log(`   ⏰ Current time: ${result.rows[0].current_time}`);
      console.log(
        `   🐘 PostgreSQL: ${result.rows[0].postgres_version.split(' ')[0]}`,
      );

      // Check extensions
      console.log('   🔍 Checking extensions...');
      const extensionsResult = await client.query(`
        SELECT extname, extversion 
        FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'vector')
        ORDER BY extname
      `);

      if (extensionsResult.rows.length > 0) {
        console.log('   ✅ Extensions found:');
        extensionsResult.rows.forEach((row) => {
          console.log(`     - ${row.extname} (v${row.extversion})`);
        });
      } else {
        console.log(
          '   ⚠️  Extensions not found - you may need to enable them',
        );
      }

      // Check tables
      console.log('   🔍 Checking tables...');
      const tablesResult = await client.query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      const tableCount = parseInt(tablesResult.rows[0].table_count);
      console.log(`   📋 Found ${tableCount} tables`);

      await client.end();

      console.log('\n🎉 Connection successful! This configuration works.');
      console.log('\n✅ Your database is ready. Next steps:');
      console.log('1. Enable extensions (if needed):');
      console.log('   - Go to Supabase Dashboard → SQL Editor');
      console.log('   - Run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('   - Run: CREATE EXTENSION IF NOT EXISTS "vector";');
      console.log('2. Set up schema: npm run migration:run');
      console.log('3. Start application: npm run start:dev');

      return true;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);

      if (error.code === 'EHOSTUNREACH') {
        console.log('   💡 Network connectivity issue - trying next method...');
      } else if (error.message.includes('password authentication failed')) {
        console.log('   💡 Authentication issue - check password');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('   💡 DNS resolution issue');
      }

      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  console.log('\n❌ All connection methods failed.');
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check your internet connection');
  console.log('2. Verify Supabase project is active');
  console.log('3. Try connecting from Supabase dashboard first');
  console.log('4. Check if your firewall blocks PostgreSQL connections');
  console.log('5. Try using a VPN or different network');

  return false;
}

// Run the test
testConnection().catch(console.error);
