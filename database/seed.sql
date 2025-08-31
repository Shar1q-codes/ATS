-- Seed data for AI-Native ATS
-- Run this after creating the schema

-- Insert sample company profiles
INSERT INTO company_profiles (id, name, industry, size, work_arrangement, location, preferences) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'TechStartup Inc',
    'Technology',
    'startup',
    'remote',
    'San Francisco, CA',
    '{"prioritySkills": ["React", "Node.js", "TypeScript"], "dealBreakers": ["No remote experience"], "niceToHave": ["AWS", "Docker"]}'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Enterprise Corp',
    'Finance',
    'large',
    'hybrid',
    'New York, NY',
    '{"prioritySkills": ["Java", "Spring", "Microservices"], "dealBreakers": ["Less than 5 years experience"], "niceToHave": ["Kubernetes", "CI/CD"]}'
);

-- Insert sample users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, company_id) VALUES
(
    '550e8400-e29b-41d4-a716-446655440010',
    'admin@techstartup.com',
    '$2b$10$rQZ8QqZ8QqZ8QqZ8QqZ8Qu', -- password: 'password123'
    'John',
    'Doe',
    'admin',
    '550e8400-e29b-41d4-a716-446655440001'
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    'recruiter@enterprise.com',
    '$2b$10$rQZ8QqZ8QqZ8QqZ8QqZ8Qu', -- password: 'password123'
    'Jane',
    'Smith',
    'recruiter',
    '550e8400-e29b-41d4-a716-446655440002'
);

-- Insert sample job families
INSERT INTO job_families (id, name, description, skill_categories) VALUES
(
    '550e8400-e29b-41d4-a716-446655440020',
    'Software Engineer',
    'Software development roles across all levels',
    '{"Programming Languages", "Frameworks", "Databases", "Cloud Platforms"}'
),
(
    '550e8400-e29b-41d4-a716-446655440021',
    'Data Scientist',
    'Data analysis and machine learning roles',
    '{"Machine Learning", "Statistics", "Programming", "Data Visualization"}'
);

-- Insert sample job templates
INSERT INTO job_templates (id, job_family_id, name, level, experience_range_min, experience_range_max, salary_range_min, salary_range_max) VALUES
(
    '550e8400-e29b-41d4-a716-446655440030',
    '550e8400-e29b-41d4-a716-446655440020',
    'Senior Frontend Developer',
    'senior',
    5,
    8,
    120000,
    180000
),
(
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440020',
    'Full Stack Developer',
    'mid',
    3,
    6,
    90000,
    140000
),
(
    '550e8400-e29b-41d4-a716-446655440032',
    '550e8400-e29b-41d4-a716-446655440021',
    'Senior Data Scientist',
    'senior',
    4,
    7,
    130000,
    200000
);

-- Insert sample requirements for job templates
INSERT INTO requirement_items (type, category, description, weight, job_template_id) VALUES
-- Senior Frontend Developer requirements
('skill', 'must', '5+ years of React development experience', 10, '550e8400-e29b-41d4-a716-446655440030'),
('skill', 'must', 'Strong JavaScript/TypeScript skills', 9, '550e8400-e29b-41d4-a716-446655440030'),
('skill', 'should', 'Experience with state management (Redux, Zustand)', 7, '550e8400-e29b-41d4-a716-446655440030'),
('skill', 'should', 'CSS frameworks (Tailwind, Styled Components)', 6, '550e8400-e29b-41d4-a716-446655440030'),
('skill', 'nice', 'Next.js framework experience', 5, '550e8400-e29b-41d4-a716-446655440030'),
('experience', 'must', 'Bachelor degree in Computer Science or equivalent', 8, '550e8400-e29b-41d4-a716-446655440030'),

-- Full Stack Developer requirements
('skill', 'must', '3+ years of full-stack development', 10, '550e8400-e29b-41d4-a716-446655440031'),
('skill', 'must', 'Frontend: React or Vue.js', 9, '550e8400-e29b-41d4-a716-446655440031'),
('skill', 'must', 'Backend: Node.js or Python', 9, '550e8400-e29b-41d4-a716-446655440031'),
('skill', 'should', 'Database experience (PostgreSQL, MongoDB)', 7, '550e8400-e29b-41d4-a716-446655440031'),
('skill', 'should', 'RESTful API development', 8, '550e8400-e29b-41d4-a716-446655440031'),
('skill', 'nice', 'Cloud platforms (AWS, GCP, Azure)', 6, '550e8400-e29b-41d4-a716-446655440031'),

-- Senior Data Scientist requirements
('skill', 'must', '4+ years of data science experience', 10, '550e8400-e29b-41d4-a716-446655440032'),
('skill', 'must', 'Python and R programming', 9, '550e8400-e29b-41d4-a716-446655440032'),
('skill', 'must', 'Machine learning frameworks (scikit-learn, TensorFlow, PyTorch)', 9, '550e8400-e29b-41d4-a716-446655440032'),
('skill', 'should', 'Statistical analysis and hypothesis testing', 8, '550e8400-e29b-41d4-a716-446655440032'),
('skill', 'should', 'Data visualization (Matplotlib, Plotly, Tableau)', 7, '550e8400-e29b-41d4-a716-446655440032'),
('education', 'must', 'Masters degree in Data Science, Statistics, or related field', 8, '550e8400-e29b-41d4-a716-446655440032');

-- Insert sample company job variants
INSERT INTO company_job_variants (id, job_template_id, company_profile_id, custom_title, is_active) VALUES
(
    '550e8400-e29b-41d4-a716-446655440040',
    '550e8400-e29b-41d4-a716-446655440030',
    '550e8400-e29b-41d4-a716-446655440001',
    'Senior React Developer - Remote',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440002',
    'Full Stack Engineer - Hybrid',
    true
);

-- Insert sample candidates
INSERT INTO candidates (id, email, first_name, last_name, phone, location, total_experience, consent_given, consent_date) VALUES
(
    '550e8400-e29b-41d4-a716-446655440050',
    'alice.developer@email.com',
    'Alice',
    'Johnson',
    '+1-555-0101',
    'San Francisco, CA',
    6,
    true,
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440051',
    'bob.fullstack@email.com',
    'Bob',
    'Wilson',
    '+1-555-0102',
    'New York, NY',
    4,
    true,
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440052',
    'carol.datascientist@email.com',
    'Carol',
    'Davis',
    '+1-555-0103',
    'Austin, TX',
    5,
    true,
    NOW()
);

-- Insert sample parsed resume data
INSERT INTO parsed_resume_data (candidate_id, skills, experience, education, summary, parsing_confidence) VALUES
(
    '550e8400-e29b-41d4-a716-446655440050',
    '[
        {"name": "React", "yearsOfExperience": 6, "proficiency": "expert"},
        {"name": "JavaScript", "yearsOfExperience": 7, "proficiency": "expert"},
        {"name": "TypeScript", "yearsOfExperience": 4, "proficiency": "advanced"},
        {"name": "Redux", "yearsOfExperience": 3, "proficiency": "advanced"},
        {"name": "Next.js", "yearsOfExperience": 2, "proficiency": "intermediate"}
    ]',
    '[
        {
            "jobTitle": "Senior Frontend Developer",
            "company": "Tech Solutions Inc",
            "startDate": "2020-01-01",
            "endDate": "2024-01-01",
            "description": "Led frontend development for multiple React applications, mentored junior developers"
        },
        {
            "jobTitle": "Frontend Developer",
            "company": "StartupXYZ",
            "startDate": "2018-06-01",
            "endDate": "2019-12-01",
            "description": "Developed responsive web applications using React and modern JavaScript"
        }
    ]',
    '[
        {
            "degree": "Bachelor of Science",
            "fieldOfStudy": "Computer Science",
            "institution": "University of California",
            "graduationYear": 2018
        }
    ]',
    'Experienced Senior Frontend Developer with 6+ years specializing in React ecosystem. Proven track record of building scalable web applications and leading development teams.',
    0.95
),
(
    '550e8400-e29b-41d4-a716-446655440051',
    '[
        {"name": "Node.js", "yearsOfExperience": 4, "proficiency": "advanced"},
        {"name": "React", "yearsOfExperience": 3, "proficiency": "advanced"},
        {"name": "PostgreSQL", "yearsOfExperience": 3, "proficiency": "intermediate"},
        {"name": "Express.js", "yearsOfExperience": 4, "proficiency": "advanced"},
        {"name": "AWS", "yearsOfExperience": 2, "proficiency": "intermediate"}
    ]',
    '[
        {
            "jobTitle": "Full Stack Developer",
            "company": "Digital Agency",
            "startDate": "2021-03-01",
            "endDate": "2024-01-01",
            "description": "Built end-to-end web applications using Node.js backend and React frontend"
        },
        {
            "jobTitle": "Backend Developer",
            "company": "E-commerce Startup",
            "startDate": "2020-01-01",
            "endDate": "2021-02-01",
            "description": "Developed RESTful APIs and microservices using Node.js and PostgreSQL"
        }
    ]',
    '[
        {
            "degree": "Bachelor of Engineering",
            "fieldOfStudy": "Software Engineering",
            "institution": "New York Institute of Technology",
            "graduationYear": 2019
        }
    ]',
    'Full Stack Developer with 4 years of experience building modern web applications. Strong expertise in Node.js backend development and React frontend.',
    0.92
);

-- Insert sample applications
INSERT INTO applications (id, candidate_id, company_job_variant_id, status, fit_score) VALUES
(
    '550e8400-e29b-41d4-a716-446655440060',
    '550e8400-e29b-41d4-a716-446655440050',
    '550e8400-e29b-41d4-a716-446655440040',
    'shortlisted',
    88
),
(
    '550e8400-e29b-41d4-a716-446655440061',
    '550e8400-e29b-41d4-a716-446655440051',
    '550e8400-e29b-41d4-a716-446655440041',
    'interview_scheduled',
    82
);

-- Insert sample match explanations
INSERT INTO match_explanations (application_id, overall_score, must_have_score, should_have_score, nice_to_have_score, strengths, gaps, recommendations) VALUES
(
    '550e8400-e29b-41d4-a716-446655440060',
    88,
    95,
    85,
    70,
    '{"Excellent React experience (6 years)", "Strong TypeScript skills", "Leadership experience"}',
    '{"Limited Next.js experience"}',
    '{"Consider Next.js training for better framework knowledge"}'
),
(
    '550e8400-e29b-41d4-a716-446655440061',
    82,
    90,
    80,
    65,
    '{"Strong full-stack experience", "Good Node.js and React skills", "Database experience"}',
    '{"Limited cloud platform experience", "No microservices experience mentioned"}',
    '{"AWS certification would strengthen profile", "Consider microservices architecture training"}'
);

-- Insert sample email templates
INSERT INTO email_templates (name, subject, body, template_type, company_id) VALUES
(
    'Application Received',
    'Thank you for your application - {{jobTitle}}',
    'Dear {{candidateName}},

Thank you for applying to the {{jobTitle}} position at {{companyName}}. We have received your application and will review it shortly.

We will contact you within 5-7 business days regarding the next steps.

Best regards,
{{companyName}} Recruitment Team',
    'application_received',
    '550e8400-e29b-41d4-a716-446655440001'
),
(
    'Interview Invitation',
    'Interview Invitation - {{jobTitle}} at {{companyName}}',
    'Dear {{candidateName}},

We are pleased to invite you for an interview for the {{jobTitle}} position at {{companyName}}.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Format: {{interviewFormat}}

Please confirm your availability by replying to this email.

Best regards,
{{recruiterName}}
{{companyName}}',
    'interview_invitation',
    '550e8400-e29b-41d4-a716-446655440001'
);

-- Insert sample application notes
INSERT INTO application_notes (application_id, user_id, note) VALUES
(
    '550e8400-e29b-41d4-a716-446655440060',
    '550e8400-e29b-41d4-a716-446655440010',
    'Excellent technical background. Strong React skills align perfectly with our needs.'
),
(
    '550e8400-e29b-41d4-a716-446655440061',
    '550e8400-e29b-41d4-a716-446655440011',
    'Good full-stack experience. Would benefit from more cloud platform exposure.'
);

-- Insert sample stage history
INSERT INTO stage_history (application_id, from_stage, to_stage, changed_by, notes) VALUES
(
    '550e8400-e29b-41d4-a716-446655440060',
    'applied',
    'screening',
    '550e8400-e29b-41d4-a716-446655440010',
    'Initial screening passed - technical skills look good'
),
(
    '550e8400-e29b-41d4-a716-446655440060',
    'screening',
    'shortlisted',
    '550e8400-e29b-41d4-a716-446655440010',
    'Moved to shortlist - excellent React experience'
),
(
    '550e8400-e29b-41d4-a716-446655440061',
    'applied',
    'screening',
    '550e8400-e29b-41d4-a716-446655440011',
    'Resume review completed'
),
(
    '550e8400-e29b-41d4-a716-446655440061',
    'screening',
    'interview_scheduled',
    '550e8400-e29b-41d4-a716-446655440011',
    'Technical interview scheduled for next week'
);