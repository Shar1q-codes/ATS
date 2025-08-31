import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable necessary extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // Company Profiles
    await queryRunner.query(`
      CREATE TABLE "company_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "industry" character varying(100),
        "size" character varying(50) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
        "culture" text array,
        "benefits" text array,
        "work_arrangement" character varying(50) CHECK (work_arrangement IN ('remote', 'hybrid', 'onsite')),
        "location" character varying(255),
        "preferences" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_company_profiles" PRIMARY KEY ("id")
      )
    `);

    // Job Families
    await queryRunner.query(`
      CREATE TABLE "job_families" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "skill_categories" text array,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_job_families" PRIMARY KEY ("id")
      )
    `);

    // Job Templates
    await queryRunner.query(`
      CREATE TABLE "job_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_family_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "level" character varying(50) CHECK (level IN ('junior', 'mid', 'senior', 'lead', 'principal')),
        "experience_range_min" integer,
        "experience_range_max" integer,
        "salary_range_min" integer,
        "salary_range_max" integer,
        "salary_currency" character varying(3) DEFAULT 'USD',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_job_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_templates_job_family" FOREIGN KEY ("job_family_id") REFERENCES "job_families"("id") ON DELETE CASCADE
      )
    `);

    // Company Job Variants
    await queryRunner.query(`
      CREATE TABLE "company_job_variants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_template_id" uuid NOT NULL,
        "company_profile_id" uuid NOT NULL,
        "custom_title" character varying(255),
        "custom_description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_company_job_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_company_job_variants_job_template" FOREIGN KEY ("job_template_id") REFERENCES "job_templates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_job_variants_company_profile" FOREIGN KEY ("company_profile_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE
      )
    `);

    // Requirement Items
    await queryRunner.query(`
      CREATE TABLE "requirement_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(50) CHECK (type IN ('skill', 'experience', 'education', 'certification', 'other')),
        "category" character varying(50) CHECK (category IN ('must', 'should', 'nice')),
        "description" text NOT NULL,
        "weight" integer DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
        "alternatives" text array,
        "job_template_id" uuid,
        "company_job_variant_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_requirement_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_requirement_items_job_template" FOREIGN KEY ("job_template_id") REFERENCES "job_templates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_requirement_items_company_job_variant" FOREIGN KEY ("company_job_variant_id") REFERENCES "company_job_variants"("id") ON DELETE CASCADE
      )
    `);

    // Users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "role" character varying(50) NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'hiring_manager')),
        "company_id" uuid,
        "is_active" boolean DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_company" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE SET NULL
      )
    `);

    // JD Versions
    await queryRunner.query(`
      CREATE TABLE "jd_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_job_variant_id" uuid NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "resolved_spec" jsonb NOT NULL,
        "published_content" text,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_jd_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_jd_versions_company_job_variant" FOREIGN KEY ("company_job_variant_id") REFERENCES "company_job_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_jd_versions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")
      )
    `);

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_requirement_items_job_template_id" ON "requirement_items" ("job_template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_requirement_items_company_job_variant_id" ON "requirement_items" ("company_job_variant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_job_templates_job_family_id" ON "job_templates" ("job_family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_company_job_variants_job_template_id" ON "company_job_variants" ("job_template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_company_job_variants_company_profile_id" ON "company_job_variants" ("company_profile_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_company_id" ON "users" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_jd_versions_company_job_variant_id" ON "jd_versions" ("company_job_variant_id")`,
    );

    // Create updated_at trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add updated_at triggers
    await queryRunner.query(
      `CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON "company_profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_job_families_updated_at BEFORE UPDATE ON "job_families" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_job_templates_updated_at BEFORE UPDATE ON "job_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_company_job_variants_updated_at BEFORE UPDATE ON "company_job_variants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_users_updated_at ON "users"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_company_job_variants_updated_at ON "company_job_variants"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_job_templates_updated_at ON "job_templates"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_job_families_updated_at ON "job_families"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON "company_profiles"`,
    );

    // Drop function
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column()`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_jd_versions_company_job_variant_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_users_company_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_company_job_variants_company_profile_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_company_job_variants_job_template_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_job_templates_job_family_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_requirement_items_company_job_variant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_requirement_items_job_template_id"`,
    );

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "jd_versions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "requirement_items"`);
    await queryRunner.query(`DROP TABLE "company_job_variants"`);
    await queryRunner.query(`DROP TABLE "job_templates"`);
    await queryRunner.query(`DROP TABLE "job_families"`);
    await queryRunner.query(`DROP TABLE "company_profiles"`);

    // Drop extensions (optional, as they might be used by other parts)
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "vector"`);
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
