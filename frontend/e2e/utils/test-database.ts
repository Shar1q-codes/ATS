import { Pool } from "pg";

export class TestDatabase {
  private pool: Pool;
  private testDbName: string;

  constructor() {
    this.testDbName = `ats_test_${Date.now()}`;
    this.pool = new Pool({
      host: process.env.TEST_DB_HOST || "localhost",
      port: parseInt(process.env.TEST_DB_PORT || "5432"),
      user: process.env.TEST_DB_USER || "postgres",
      password: process.env.TEST_DB_PASSWORD || "password",
      database: "postgres", // Connect to default db first
    });
  }

  async initialize() {
    try {
      // Create test database
      await this.pool.query(`CREATE DATABASE "${this.testDbName}"`);

      // Switch to test database
      await this.pool.end();
      this.pool = new Pool({
        host: process.env.TEST_DB_HOST || "localhost",
        port: parseInt(process.env.TEST_DB_PORT || "5432"),
        user: process.env.TEST_DB_USER || "postgres",
        password: process.env.TEST_DB_PASSWORD || "password",
        database: this.testDbName,
      });

      // Run migrations
      await this.runMigrations();

      console.log(`✅ Test database "${this.testDbName}" initialized`);
    } catch (error) {
      console.error("❌ Failed to initialize test database:", error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.pool.end();

      // Connect to default database to drop test database
      const defaultPool = new Pool({
        host: process.env.TEST_DB_HOST || "localhost",
        port: parseInt(process.env.TEST_DB_PORT || "5432"),
        user: process.env.TEST_DB_USER || "postgres",
        password: process.env.TEST_DB_PASSWORD || "password",
        database: "postgres",
      });

      await defaultPool.query(`DROP DATABASE IF EXISTS "${this.testDbName}"`);
      await defaultPool.end();

      console.log(`✅ Test database "${this.testDbName}" cleaned up`);
    } catch (error) {
      console.error("❌ Failed to cleanup test database:", error);
    }
  }

  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }

  async clearAllTables() {
    const tables = [
      "stage_history",
      "application_notes",
      "applications",
      "match_explanations",
      "parsed_resume_data",
      "candidates",
      "jd_versions",
      "company_job_variants",
      "requirement_items",
      "job_templates",
      "job_families",
      "company_profiles",
      "email_logs",
      "email_templates",
      "users",
    ];

    for (const table of tables) {
      await this.pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
  }

  private async runMigrations() {
    // This would typically run your actual database migrations
    // For now, we'll create basic tables needed for E2E tests

    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    // Create basic tables structure
    await this.createBasicTables();
  }

  private async createBasicTables() {
    // Users table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'recruiter',
        company_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Job families table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS job_families (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        skill_categories TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Candidates table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        location VARCHAR(255),
        linkedin_url VARCHAR(500),
        portfolio_url VARCHAR(500),
        resume_url VARCHAR(500),
        skill_embeddings vector(1536),
        consent_given BOOLEAN DEFAULT false,
        consent_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Applications table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
        job_variant_id UUID,
        status VARCHAR(50) DEFAULT 'applied',
        fit_score INTEGER DEFAULT 0,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  getConnectionString() {
    return `postgresql://${process.env.TEST_DB_USER || "postgres"}:${process.env.TEST_DB_PASSWORD || "password"}@${process.env.TEST_DB_HOST || "localhost"}:${process.env.TEST_DB_PORT || "5432"}/${this.testDbName}`;
  }
}
