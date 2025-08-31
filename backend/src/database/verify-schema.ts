#!/usr/bin/env ts-node

/**
 * Schema Verification Script
 *
 * This script verifies that the database schema matches the expected structure
 * for the AI-native ATS job posting variation model.
 */

import { AppDataSource } from './data-source';

async function verifySchema(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // Check if required extensions are installed
    const extensions = await AppDataSource.query(`
      SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector')
    `);

    const hasUuidOssp = extensions.some(
      (ext: any) => ext.extname === 'uuid-ossp',
    );
    const hasVector = extensions.some((ext: any) => ext.extname === 'vector');

    console.log(
      `✅ uuid-ossp extension: ${hasUuidOssp ? 'installed' : '❌ missing'}`,
    );
    console.log(
      `✅ vector extension: ${hasVector ? 'installed' : '❌ missing'}`,
    );

    // Check required tables for job posting variation model
    const requiredTables = [
      'company_profiles',
      'job_families',
      'job_templates',
      'company_job_variants',
      'requirement_items',
      'jd_versions',
      'users',
    ];

    const existingTables = await AppDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const existingTableNames = existingTables.map((t: any) => t.table_name);

    console.log('\n📋 Table Verification:');
    for (const table of requiredTables) {
      const exists = existingTableNames.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }

    // Check sample data
    console.log('\n📝 Sample Data Verification:');

    const companyCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM company_profiles',
    );
    console.log(
      `  ${parseInt(companyCount[0].count) > 0 ? '✅' : '❌'} Company profiles: ${companyCount[0].count}`,
    );

    const jobFamilyCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM job_families',
    );
    console.log(
      `  ${parseInt(jobFamilyCount[0].count) > 0 ? '✅' : '❌'} Job families: ${jobFamilyCount[0].count}`,
    );

    const jobTemplateCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM job_templates',
    );
    console.log(
      `  ${parseInt(jobTemplateCount[0].count) > 0 ? '✅' : '❌'} Job templates: ${jobTemplateCount[0].count}`,
    );

    const requirementCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM requirement_items',
    );
    console.log(
      `  ${parseInt(requirementCount[0].count) > 0 ? '✅' : '❌'} Requirement items: ${requirementCount[0].count}`,
    );

    const variantCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM company_job_variants',
    );
    console.log(
      `  ${parseInt(variantCount[0].count) > 0 ? '✅' : '❌'} Company job variants: ${variantCount[0].count}`,
    );

    console.log('\n🎉 Schema verification completed!');
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  void verifySchema();
}

export { verifySchema };
