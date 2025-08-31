import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateApplicationSchema1700000000002
  implements MigrationInterface
{
  name = 'CandidateApplicationSchema1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Candidates
    await queryRunner.query(`
      CREATE TABLE "candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "phone" character varying(20),
        "location" character varying(255),
        "linkedin_url" character varying(500),
        "portfolio_url" character varying(500),
        "resume_url" character varying(500),
        "skill_embeddings" vector(1536),
        "total_experience" integer DEFAULT 0,
        "consent_given" boolean DEFAULT false,
        "consent_date" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_candidates_email" UNIQUE ("email")
      )
    `);

    // Parsed Resume Data
    await queryRunner.query(`
      CREATE TABLE "parsed_resume_data" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "skills" jsonb,
        "experience" jsonb,
        "education" jsonb,
        "certifications" jsonb,
        "summary" text,
        "raw_text" text,
        "parsing_confidence" decimal(3,2),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_parsed_resume_data" PRIMARY KEY ("id"),
        CONSTRAINT "FK_parsed_resume_data_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE
      )
    `);

    // Applications
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "candidate_id" uuid NOT NULL,
        "company_job_variant_id" uuid NOT NULL,
        "status" character varying(50) DEFAULT 'applied' CHECK (status IN (
          'applied', 'screening', 'shortlisted', 'interview_scheduled', 
          'interview_completed', 'offer_extended', 'offer_accepted', 'hired', 'rejected'
        )),
        "fit_score" integer CHECK (fit_score >= 0 AND fit_score <= 100),
        "applied_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "last_updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_applications_candidate_job_variant" UNIQUE ("candidate_id", "company_job_variant_id"),
        CONSTRAINT "FK_applications_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_applications_company_job_variant" FOREIGN KEY ("company_job_variant_id") REFERENCES "company_job_variants"("id") ON DELETE CASCADE
      )
    `);

    // Match Explanations
    await queryRunner.query(`
      CREATE TABLE "match_explanations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "overall_score" integer NOT NULL,
        "must_have_score" integer NOT NULL,
        "should_have_score" integer NOT NULL,
        "nice_to_have_score" integer NOT NULL,
        "strengths" text array,
        "gaps" text array,
        "recommendations" text array,
        "detailed_analysis" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_match_explanations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_match_explanations_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE
      )
    `);

    // Application Notes
    await queryRunner.query(`
      CREATE TABLE "application_notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "note" text NOT NULL,
        "is_internal" boolean DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_application_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_application_notes_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_application_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    // Stage History
    await queryRunner.query(`
      CREATE TABLE "stage_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "from_stage" character varying(50),
        "to_stage" character varying(50) NOT NULL,
        "changed_by" uuid NOT NULL,
        "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "notes" text,
        "automated" boolean DEFAULT false,
        CONSTRAINT "PK_stage_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stage_history_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stage_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      )
    `);

    // Email Templates
    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "subject" character varying(500) NOT NULL,
        "body" text NOT NULL,
        "template_type" character varying(100) NOT NULL,
        "company_id" uuid,
        "is_active" boolean DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_email_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_templates_company" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id")
      )
    `);

    // Email Logs
    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid,
        "candidate_id" uuid NOT NULL,
        "template_id" uuid,
        "subject" character varying(500) NOT NULL,
        "body" text NOT NULL,
        "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "delivery_status" character varying(50) DEFAULT 'sent',
        "opened_at" TIMESTAMP WITH TIME ZONE,
        "clicked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_email_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_logs_application" FOREIGN KEY ("application_id") REFERENCES "applications"("id"),
        CONSTRAINT "FK_email_logs_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id"),
        CONSTRAINT "FK_email_logs_template" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id")
      )
    `);

    // Create performance indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_candidates_email" ON "candidates" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_candidates_skill_embeddings" ON "candidates" USING ivfflat ("skill_embeddings" vector_cosine_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parsed_resume_data_candidate_id" ON "parsed_resume_data" ("candidate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_candidate_id" ON "applications" ("candidate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_company_job_variant_id" ON "applications" ("company_job_variant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_applications_status" ON "applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_match_explanations_application_id" ON "match_explanations" ("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_application_notes_application_id" ON "application_notes" ("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stage_history_application_id" ON "stage_history" ("application_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_templates_company_id" ON "email_templates" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_candidate_id" ON "email_logs" ("candidate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_logs_application_id" ON "email_logs" ("application_id")`,
    );

    // Add updated_at triggers for tables that need them
    await queryRunner.query(
      `CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON "candidates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_applications_last_updated BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON "email_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_email_templates_updated_at ON "email_templates"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_applications_last_updated ON "applications"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_candidates_updated_at ON "candidates"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_email_logs_application_id"`);
    await queryRunner.query(`DROP INDEX "IDX_email_logs_candidate_id"`);
    await queryRunner.query(`DROP INDEX "IDX_email_templates_company_id"`);
    await queryRunner.query(`DROP INDEX "IDX_stage_history_application_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_application_notes_application_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_match_explanations_application_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_applications_status"`);
    await queryRunner.query(
      `DROP INDEX "IDX_applications_company_job_variant_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_applications_candidate_id"`);
    await queryRunner.query(`DROP INDEX "IDX_parsed_resume_data_candidate_id"`);
    await queryRunner.query(`DROP INDEX "IDX_candidates_skill_embeddings"`);
    await queryRunner.query(`DROP INDEX "IDX_candidates_email"`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "email_logs"`);
    await queryRunner.query(`DROP TABLE "email_templates"`);
    await queryRunner.query(`DROP TABLE "stage_history"`);
    await queryRunner.query(`DROP TABLE "application_notes"`);
    await queryRunner.query(`DROP TABLE "match_explanations"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "parsed_resume_data"`);
    await queryRunner.query(`DROP TABLE "candidates"`);
  }
}
