import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedData1700000000003 implements MigrationInterface {
  name = 'SeedData1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert sample company profiles
    await queryRunner.query(`
      INSERT INTO company_profiles (id, name, industry, size, culture, benefits, work_arrangement, location, preferences) VALUES
      (
        '550e8400-e29b-41d4-a716-446655440001',
        'TechStart Inc',
        'Technology',
        'startup',
        ARRAY['innovative', 'fast-paced', 'collaborative'],
        ARRAY['equity', 'flexible hours', 'remote work'],
        'hybrid',
        'San Francisco, CA',
        '{"prioritySkills": ["JavaScript", "React", "Node.js"], "dealBreakers": ["no remote work"], "niceToHave": ["AWS", "Docker"]}'::jsonb
      ),
      (
        '550e8400-e29b-41d4-a716-446655440002',
        'Enterprise Solutions Corp',
        'Enterprise Software',
        'large',
        ARRAY['structured', 'professional', 'growth-oriented'],
        ARRAY['health insurance', '401k', 'paid time off'],
        'onsite',
        'New York, NY',
        '{"prioritySkills": ["Java", "Spring", "Microservices"], "dealBreakers": ["junior level"], "niceToHave": ["Kubernetes", "CI/CD"]}'::jsonb
      ),
      (
        '550e8400-e29b-41d4-a716-446655440003',
        'Creative Agency Plus',
        'Marketing & Advertising',
        'medium',
        ARRAY['creative', 'collaborative', 'client-focused'],
        ARRAY['creative freedom', 'flexible schedule', 'professional development'],
        'hybrid',
        'Austin, TX',
        '{"prioritySkills": ["Design", "UX/UI", "Adobe Creative Suite"], "dealBreakers": ["no portfolio"], "niceToHave": ["Figma", "Prototyping"]}'::jsonb
      )
    `);

    // Insert sample job families
    await queryRunner.query(`
      INSERT INTO job_families (id, name, description, skill_categories) VALUES
      (
        '660e8400-e29b-41d4-a716-446655440001',
        'Software Engineer',
        'Develops and maintains software applications using various programming languages and frameworks',
        ARRAY['Programming Languages', 'Frameworks', 'Databases', 'DevOps', 'Testing']
      ),
      (
        '660e8400-e29b-41d4-a716-446655440002',
        'Product Manager',
        'Manages product development lifecycle from conception to launch',
        ARRAY['Product Strategy', 'Analytics', 'Communication', 'Technical Knowledge', 'Market Research']
      ),
      (
        '660e8400-e29b-41d4-a716-446655440003',
        'UX/UI Designer',
        'Creates user-centered designs for digital products and interfaces',
        ARRAY['Design Tools', 'User Research', 'Prototyping', 'Visual Design', 'Interaction Design']
      ),
      (
        '660e8400-e29b-41d4-a716-446655440004',
        'Data Scientist',
        'Analyzes complex data to extract insights and build predictive models',
        ARRAY['Statistics', 'Machine Learning', 'Programming', 'Data Visualization', 'Domain Knowledge']
      )
    `);

    // Insert sample job templates
    await queryRunner.query(`
      INSERT INTO job_templates (id, job_family_id, name, level, experience_range_min, experience_range_max, salary_range_min, salary_range_max) VALUES
      (
        '770e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'Frontend Software Engineer',
        'mid',
        2,
        5,
        80000,
        120000
      ),
      (
        '770e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        'Senior Backend Engineer',
        'senior',
        5,
        8,
        120000,
        180000
      ),
      (
        '770e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        'Full Stack Developer',
        'mid',
        3,
        6,
        90000,
        140000
      ),
      (
        '770e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        'Senior Product Manager',
        'senior',
        4,
        7,
        130000,
        200000
      ),
      (
        '770e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440003',
        'UX Designer',
        'mid',
        2,
        5,
        70000,
        110000
      )
    `);

    // Insert comprehensive requirement items for job templates
    await queryRunner.query(`
      INSERT INTO requirement_items (type, category, description, weight, job_template_id) VALUES
      -- Frontend Engineer requirements
      ('skill', 'must', 'Proficiency in JavaScript and modern ES6+ features', 9, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'must', 'Experience with React.js and component-based architecture', 9, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'must', 'Strong understanding of HTML5 and CSS3', 8, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'should', 'Knowledge of TypeScript for type-safe development', 7, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'should', 'Experience with CSS frameworks like TailwindCSS or styled-components', 6, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'should', 'Understanding of responsive design principles', 7, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'nice', 'Familiarity with Next.js or other React frameworks', 5, '770e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'nice', 'Experience with testing frameworks (Jest, React Testing Library)', 5, '770e8400-e29b-41d4-a716-446655440001'),
      ('experience', 'must', '2-5 years of frontend development experience', 8, '770e8400-e29b-41d4-a716-446655440001'),
      ('experience', 'should', 'Experience working in agile development environments', 6, '770e8400-e29b-41d4-a716-446655440001'),

      -- Senior Backend Engineer requirements
      ('skill', 'must', 'Expert-level knowledge of Node.js and server-side JavaScript', 10, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'must', 'Experience with database design and optimization (PostgreSQL/MongoDB)', 9, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'must', 'Proficiency in API design and RESTful services', 9, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'must', 'Strong understanding of software architecture patterns', 8, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'should', 'Experience with cloud platforms (AWS, GCP, or Azure)', 8, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'should', 'Knowledge of containerization with Docker and Kubernetes', 7, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'should', 'Experience with CI/CD pipelines and DevOps practices', 7, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'nice', 'Experience with microservices architecture', 6, '770e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'nice', 'Knowledge of message queues and event-driven architecture', 5, '770e8400-e29b-41d4-a716-446655440002'),
      ('experience', 'must', '5-8 years of backend development experience', 9, '770e8400-e29b-41d4-a716-446655440002'),
      ('experience', 'should', 'Experience leading technical projects or mentoring junior developers', 7, '770e8400-e29b-41d4-a716-446655440002'),

      -- Full Stack Developer requirements
      ('skill', 'must', 'Proficiency in both frontend and backend technologies', 9, '770e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'must', 'Experience with JavaScript/TypeScript across the full stack', 9, '770e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'must', 'Knowledge of React.js and Node.js', 8, '770e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'should', 'Experience with database technologies (SQL and NoSQL)', 7, '770e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'should', 'Understanding of version control systems (Git)', 6, '770e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'nice', 'Experience with cloud deployment and DevOps', 5, '770e8400-e29b-41d4-a716-446655440003'),
      ('experience', 'must', '3-6 years of full stack development experience', 8, '770e8400-e29b-41d4-a716-446655440003'),

      -- Senior Product Manager requirements
      ('skill', 'must', 'Strong product strategy and roadmap development skills', 10, '770e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'must', 'Experience with data analysis and metrics-driven decision making', 9, '770e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'must', 'Excellent communication and stakeholder management skills', 9, '770e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'should', 'Technical background or ability to work closely with engineering teams', 8, '770e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'should', 'Experience with agile methodologies and project management', 7, '770e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'nice', 'Experience with user research and UX design principles', 6, '770e8400-e29b-41d4-a716-446655440004'),
      ('experience', 'must', '4-7 years of product management experience', 9, '770e8400-e29b-41d4-a716-446655440004'),

      -- UX Designer requirements
      ('skill', 'must', 'Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)', 9, '770e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'must', 'Strong understanding of user-centered design principles', 9, '770e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'must', 'Experience with wireframing and prototyping', 8, '770e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'should', 'Knowledge of user research methodologies', 7, '770e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'should', 'Understanding of accessibility and inclusive design', 7, '770e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'nice', 'Basic understanding of frontend development (HTML/CSS)', 5, '770e8400-e29b-41d4-a716-446655440005'),
      ('experience', 'must', '2-5 years of UX/UI design experience', 8, '770e8400-e29b-41d4-a716-446655440005')
    `);

    // Insert sample company job variants
    await queryRunner.query(`
      INSERT INTO company_job_variants (id, job_template_id, company_profile_id, custom_title, is_active) VALUES
      (
        '880e8400-e29b-41d4-a716-446655440001',
        '770e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440001',
        'React Frontend Developer',
        true
      ),
      (
        '880e8400-e29b-41d4-a716-446655440002',
        '770e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440002',
        'Senior Node.js Backend Engineer',
        true
      ),
      (
        '880e8400-e29b-41d4-a716-446655440003',
        '770e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440001',
        'Full Stack JavaScript Developer',
        true
      ),
      (
        '880e8400-e29b-41d4-a716-446655440004',
        '770e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440002',
        'Senior Product Manager - Enterprise',
        true
      ),
      (
        '880e8400-e29b-41d4-a716-446655440005',
        '770e8400-e29b-41d4-a716-446655440005',
        '550e8400-e29b-41d4-a716-446655440003',
        'UX Designer - Creative Team',
        true
      )
    `);

    // Insert additional requirements for company variants
    await queryRunner.query(`
      INSERT INTO requirement_items (type, category, description, weight, company_job_variant_id) VALUES
      -- TechStart specific requirements for Frontend role
      ('skill', 'should', 'Experience with startup environment and rapid prototyping', 6, '880e8400-e29b-41d4-a716-446655440001'),
      ('skill', 'nice', 'Interest in AI/ML integration in frontend applications', 4, '880e8400-e29b-41d4-a716-446655440001'),
      ('other', 'should', 'Comfortable with fast-paced, iterative development cycles', 5, '880e8400-e29b-41d4-a716-446655440001'),

      -- Enterprise Corp specific requirements for Backend role
      ('skill', 'must', 'Experience with enterprise-scale applications', 8, '880e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'should', 'Knowledge of security best practices and compliance (SOC2, GDPR)', 7, '880e8400-e29b-41d4-a716-446655440002'),
      ('skill', 'should', 'Experience with performance optimization for high-traffic systems', 7, '880e8400-e29b-41d4-a716-446655440002'),

      -- TechStart Full Stack requirements
      ('skill', 'should', 'Experience with modern deployment practices (Vercel, Railway)', 6, '880e8400-e29b-41d4-a716-446655440003'),
      ('skill', 'nice', 'Familiarity with AI/ML APIs and integration', 4, '880e8400-e29b-41d4-a716-446655440003'),

      -- Enterprise Product Manager requirements
      ('skill', 'must', 'Experience managing enterprise software products', 9, '880e8400-e29b-41d4-a716-446655440004'),
      ('skill', 'should', 'Understanding of B2B sales cycles and enterprise customer needs', 7, '880e8400-e29b-41d4-a716-446655440004'),

      -- Creative Agency UX Designer requirements
      ('skill', 'should', 'Experience with brand-focused design and marketing campaigns', 7, '880e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'should', 'Portfolio demonstrating creative and innovative design solutions', 8, '880e8400-e29b-41d4-a716-446655440005'),
      ('skill', 'nice', 'Experience with motion graphics and animation', 5, '880e8400-e29b-41d4-a716-446655440005')
    `);

    // Insert sample users
    await queryRunner.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, company_id) VALUES
      (
        '990e8400-e29b-41d4-a716-446655440001',
        'admin@techstart.com',
        '$2b$10$rQZ8kHWKtGY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY',
        'John',
        'Doe',
        'admin',
        '550e8400-e29b-41d4-a716-446655440001'
      ),
      (
        '990e8400-e29b-41d4-a716-446655440002',
        'recruiter@enterprise.com',
        '$2b$10$rQZ8kHWKtGY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY',
        'Jane',
        'Smith',
        'recruiter',
        '550e8400-e29b-41d4-a716-446655440002'
      ),
      (
        '990e8400-e29b-41d4-a716-446655440003',
        'hiring@creative.com',
        '$2b$10$rQZ8kHWKtGY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY5uY',
        'Mike',
        'Johnson',
        'hiring_manager',
        '550e8400-e29b-41d4-a716-446655440003'
      )
    `);

    // Insert sample email templates
    await queryRunner.query(`
      INSERT INTO email_templates (name, subject, body, template_type, company_id) VALUES
      (
        'Application Received - TechStart',
        'Thank you for your application to {{job_title}}',
        'Dear {{candidate_name}},\n\nThank you for applying to the {{job_title}} position at {{company_name}}. We have received your application and will review it shortly.\n\nWe appreciate your interest in joining our innovative team!\n\nBest regards,\n{{company_name}} Recruiting Team',
        'application_received',
        '550e8400-e29b-41d4-a716-446655440001'
      ),
      (
        'Interview Invitation - TechStart',
        'Interview Invitation for {{job_title}} at {{company_name}}',
        'Dear {{candidate_name}},\n\nWe are pleased to invite you for an interview for the {{job_title}} position. Please reply with your availability for the coming week.\n\nBest regards,\n{{recruiter_name}}',
        'interview_invitation',
        '550e8400-e29b-41d4-a716-446655440001'
      ),
      (
        'Application Received - Enterprise',
        'Application Received - {{job_title}} Position',
        'Dear {{candidate_name}},\n\nWe have received your application for the {{job_title}} position at {{company_name}}. Our team will review your qualifications and contact you within 5-7 business days.\n\nThank you for your interest in {{company_name}}.\n\nSincerely,\nHuman Resources Team',
        'application_received',
        '550e8400-e29b-41d4-a716-446655440002'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete seed data in reverse order of dependencies
    await queryRunner.query(
      `DELETE FROM email_templates WHERE company_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003')`,
    );
    await queryRunner.query(
      `DELETE FROM users WHERE company_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003')`,
    );
    await queryRunner.query(
      `DELETE FROM requirement_items WHERE company_job_variant_id IN ('880e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440005')`,
    );
    await queryRunner.query(
      `DELETE FROM company_job_variants WHERE id IN ('880e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440005')`,
    );
    await queryRunner.query(
      `DELETE FROM requirement_items WHERE job_template_id IN ('770e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440005')`,
    );
    await queryRunner.query(
      `DELETE FROM job_templates WHERE id IN ('770e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440005')`,
    );
    await queryRunner.query(
      `DELETE FROM job_families WHERE id IN ('660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004')`,
    );
    await queryRunner.query(
      `DELETE FROM company_profiles WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003')`,
    );
  }
}
