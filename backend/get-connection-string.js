#!/usr/bin/env node

/**
 * Supabase Connection String Helper
 *
 * This script helps you get the exact connection string format
 */

console.log('🔧 Supabase Connection String Helper\n');

console.log('📋 To get your EXACT connection string:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/projects');
console.log('2. Select your project: vexbpfmwjxuiaumfvfpf');
console.log('3. Navigate to: Settings → Database');
console.log('4. Scroll down to "Connection string"');
console.log('5. Copy the EXACT connection string shown there');
console.log('');
console.log('🔍 Look for something like:');
console.log('');
console.log('📌 Session mode (direct connection):');
console.log(
  '   postgresql://postgres:[YOUR-PASSWORD]@db.vexbpfmwjxuiaumfvfpf.supabase.co:5432/postgres',
);
console.log('');
console.log('📌 Transaction mode (connection pooling):');
console.log(
  '   postgresql://postgres.vexbpfmwjxuiaumfvfpf:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
);
console.log('');
console.log('📌 Session mode (connection pooling):');
console.log(
  '   postgresql://postgres.vexbpfmwjxuiaumfvfpf:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
);
console.log('');
console.log('⚠️  Important notes:');
console.log('- Use the EXACT format shown in your Supabase dashboard');
console.log('- The username format varies (postgres vs postgres.projectref)');
console.log('- The port might be 5432 or 6543 depending on the mode');
console.log(
  '- The hostname might be db.xxx.supabase.co or pooler.supabase.com',
);
console.log('');
console.log('🔧 Once you have the exact string, update your .env file:');
console.log('');
console.log('DATABASE_URL=[PASTE_EXACT_CONNECTION_STRING_HERE]');
console.log('');
console.log('Then extract the parts:');
console.log('DB_HOST=[hostname from connection string]');
console.log('DB_PORT=[port from connection string]');
console.log('DB_USERNAME=[username from connection string]');
console.log('DB_PASSWORD=[password from connection string]');
console.log('DB_NAME=postgres');
console.log('');
console.log('🧪 Test with: npm run db:test-advanced');
