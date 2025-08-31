#!/usr/bin/env node

/**
 * Supabase Credentials Helper
 *
 * This script helps you get the correct database credentials from Supabase
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Supabase Database Credentials Helper\n');

// Read current .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Extract Supabase URL
const supabaseUrlMatch = envContent.match(
  /SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/,
);
if (!supabaseUrlMatch) {
  console.error('❌ Could not find SUPABASE_URL in .env file');
  process.exit(1);
}

const projectRef = supabaseUrlMatch[1];
console.log(`✅ Found Supabase project reference: ${projectRef}`);

console.log('\n📋 To get your database credentials:');
console.log('1. Go to: https://supabase.com/dashboard/projects');
console.log(`2. Select your project: ${projectRef}`);
console.log('3. Navigate to: Settings → Database');
console.log('4. Scroll down to "Connection string"');
console.log('5. Copy the password from the connection string');

console.log('\n🔧 Update your .env file with these values:');
console.log('');
console.log('# Replace [YOUR_DB_PASSWORD] with your actual password');
console.log(
  `DATABASE_URL=postgresql://postgres:[YOUR_DB_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`,
);
console.log(`DB_HOST=db.${projectRef}.supabase.co`);
console.log('DB_PORT=5432');
console.log('DB_USERNAME=postgres');
console.log('DB_PASSWORD=[YOUR_DB_PASSWORD]');
console.log('DB_NAME=postgres');

console.log('\n💡 Alternative connection strings you might see in Supabase:');
console.log('');
console.log('🔗 Direct connection:');
console.log(
  `   postgresql://postgres:[password]@db.${projectRef}.supabase.co:5432/postgres`,
);
console.log('');
console.log('🔗 Connection pooling (recommended for production):');
console.log(
  `   postgresql://postgres:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
);

console.log('\n⚠️  Important notes:');
console.log('- The password is NOT your Supabase account password');
console.log("- It's a separate database password shown in the dashboard");
console.log("- You may need to reset it if you haven't used it before");

console.log('\n🧪 After updating, test the connection with:');
console.log('   npm run db:test');

console.log('\n🚀 Then set up the schema with:');
console.log('   npm run db:setup');
