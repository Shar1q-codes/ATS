#!/usr/bin/env node

/**
 * Database Setup Script for Supabase
 *
 * This script helps set up the database connection and run initial migrations
 * for the AI-native ATS with Supabase.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up database connection with Supabase...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error(
    '❌ .env file not found. Please create one based on .env.example',
  );
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');

// Check if Supabase URL is configured
if (!envContent.includes('SUPABASE_URL=https://')) {
  console.error('❌ SUPABASE_URL not configured in .env file');
  console.log('Please add your Supabase URL to the .env file:');
  console.log('SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

// Extract Supabase project reference from URL
const supabaseUrlMatch = envContent.match(
  /SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/,
);
if (!supabaseUrlMatch) {
  console.error('❌ Invalid SUPABASE_URL format');
  process.exit(1);
}

const projectRef = supabaseUrlMatch[1];
console.log(`✅ Found Supabase project: ${projectRef}`);

// Check if DATABASE_URL needs to be updated
if (
  envContent.includes(
    'DATABASE_URL=postgresql://postgres.your-project:your-password@',
  )
) {
  console.log(
    '⚠️  DATABASE_URL needs to be updated with your actual Supabase credentials',
  );
  console.log('Please update the following in your .env file:');
  console.log(
    `DATABASE_URL=postgresql://postgres.${projectRef}:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  );
  console.log(`DB_HOST=aws-0-us-east-1.pooler.supabase.com`);
  console.log(`DB_USERNAME=postgres.${projectRef}`);
  console.log(`DB_PASSWORD=[YOUR_DB_PASSWORD]`);
  console.log(`DB_NAME=postgres`);
  console.log(
    '\nYou can find your database password in your Supabase dashboard under Settings > Database',
  );
  process.exit(1);
}

console.log('✅ Database configuration looks good');

// Test database connection
console.log('\n🔍 Testing database connection...');
try {
  execSync('npm run schema:verify', { stdio: 'inherit' });
  console.log('✅ Database connection successful!');
} catch (error) {
  console.log(
    '⚠️  Database connection test failed. This might be expected if schema is not set up yet.',
  );
}

// Run migrations
console.log('\n📦 Running database migrations...');
try {
  execSync('npm run migration:run', { stdio: 'inherit' });
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\nTrying to generate and run migrations...');

  try {
    // Try to generate migration first
    execSync('npm run migration:generate -- -n InitialSchema', {
      stdio: 'inherit',
    });
    execSync('npm run migration:run', { stdio: 'inherit' });
    console.log('✅ Schema setup completed!');
  } catch (migrationError) {
    console.error('❌ Schema setup failed:', migrationError.message);
    console.log('\n📋 Manual setup required:');
    console.log('1. Check your Supabase database credentials');
    console.log('2. Ensure your database password is correct in .env');
    console.log('3. Run: npm run migration:run');
  }
}

// Verify schema
console.log('\n🔍 Verifying database schema...');
try {
  execSync('npm run schema:verify', { stdio: 'inherit' });
  console.log('\n🎉 Database setup completed successfully!');
  console.log('\nYou can now:');
  console.log('- Run the backend: npm run start:dev');
  console.log('- Run tests: npm test');
  console.log('- Check schema: npm run schema:verify');
} catch (error) {
  console.log(
    '\n⚠️  Schema verification failed, but this might be expected for a fresh setup.',
  );
  console.log('The database connection should work for basic operations.');
}
