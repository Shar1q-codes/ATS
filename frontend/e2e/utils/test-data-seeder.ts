import { TestDatabase } from "./test-database";
import bcrypt from "bcrypt";

export class TestDataSeeder {
  private createdIds: {
    candidates: string[];
    jobs: string[];
    applications: string[];
    companies: string[];
  } = {
    candidates: [],
    jobs: [],
    applications: [],
    companies: [],
  };

  constructor(private db: TestDatabase) {}

  async seedTestData() {
    console.log("🌱 Seeding test data...");

    await this.seedUsers();
    await this.seedJobFamilies();
    await this.seedCandidates();
    await this.seedApplications();

    console.log("✅ Test data seeded successfully");
  }

  async seedBasicTestData() {
    // Create test company
    const companyId = await this.createTestCompany({
      name: "Test Company",
      industry: "Technology",
    });

    // Create test job
    const jobId = await this.createTestJob({
      title: "Software Engineer",
      companyId,
    });

    // Create test candidates
    const candidate1Id = await this.createTestCandidate({
      name: "John Doe",
      email: "john@example.com",
      skills: ["JavaScript", "React", "Node.js"],
    });

    const candidate2Id = await this.createTestCandidate({
      name: "Jane Smith",
      email: "jane@example.com",
      skills: ["Python", "Django", "PostgreSQL"],
    });

    // Create test applications
    await this.createTestApplication(candidate1Id, jobId);
    await this.createTestApplication(candidate2Id, jobId);

    return {
      companyId,
      jobId,
      candidateIds: [candidate1Id, candidate2Id],
    };
  }

  async seedAnalyticsData() {
    // Create sample data for analytics testing
    const companyId = await this.createTestCompany({
      name: "Analytics Test Company",
      industry: "Technology",
    });

    const jobIds = [];
    for (let i = 0; i < 5; i++) {
      const jobId = await this.createTestJob({
        title: `Test Job ${i + 1}`,
        companyId,
      });
      jobIds.push(jobId);
    }

    // Create candidates with various profiles
    const candidateIds = [];
    for (let i = 0; i < 20; i++) {
      const candidateId = await this.createTestCandidate({
        name: `Test Candidate ${i + 1}`,
        email: `candidate${i + 1}@test.com`,
        skills: this.getRandomSkills(),
        experience: Math.floor(Math.random() * 10) + 1,
      });
      candidateIds.push(candidateId);
    }

    // Create applications with different stages
    for (const candidateId of candidateIds) {
      const jobId = jobIds[Math.floor(Math.random() * jobIds.length)];
      await this.createTestApplication(candidateId, jobId, {
        stage: this.getRandomStage(),
        appliedAt: this.getRandomDate(),
      });
    }

    return { companyId, jobIds, candidateIds };
  }

  async seedLargeAnalyticsDataset(count: number) {
    const companyId = await this.createTestCompany({
      name: "Large Dataset Company",
      industry: "Technology",
    });

    const jobIds = [];
    for (let i = 0; i < Math.min(count / 10, 50); i++) {
      const jobId = await this.createTestJob({
        title: `Large Dataset Job ${i + 1}`,
        companyId,
      });
      jobIds.push(jobId);
    }

    const candidateIds = [];
    for (let i = 0; i < count; i++) {
      const candidateId = await this.createTestCandidate({
        name: `Large Dataset Candidate ${i + 1}`,
        email: `large${i + 1}@test.com`,
        skills: this.getRandomSkills(),
        experience: Math.floor(Math.random() * 15) + 1,
      });
      candidateIds.push(candidateId);

      // Create application for each candidate
      const jobId = jobIds[Math.floor(Math.random() * jobIds.length)];
      await this.createTestApplication(candidateId, jobId, {
        stage: this.getRandomStage(),
        appliedAt: this.getRandomDate(),
        fitScore: Math.floor(Math.random() * 100),
      });
    }

    return { companyId, jobIds, candidateIds };
  }

  async seedLargeCandidateDataset(count: number) {
    const candidateIds = [];
    for (let i = 0; i < count; i++) {
      const candidateId = await this.createTestCandidate({
        name: `Candidate ${i + 1}`,
        email: `candidate${i + 1}@large-test.com`,
        skills: this.getRandomSkills(),
        experience: Math.floor(Math.random() * 20) + 1,
        location: this.getRandomLocation(),
      });
      candidateIds.push(candidateId);
    }
    return candidateIds;
  }

  async seedLargeApplicationDataset(jobId: string, count: number) {
    const candidateIds = [];
    for (let i = 0; i < count; i++) {
      const candidateId = await this.createTestCandidate({
        name: `Application Candidate ${i + 1}`,
        email: `app-candidate${i + 1}@test.com`,
        skills: this.getRandomSkills(),
        experience: Math.floor(Math.random() * 10) + 1,
      });
      candidateIds.push(candidateId);

      await this.createTestApplication(candidateId, jobId, {
        stage: this.getRandomStage(),
        appliedAt: this.getRandomDate(),
        fitScore: Math.floor(Math.random() * 100),
      });
    }
    return candidateIds;
  }

  async createTestCompany(data: any): Promise<string> {
    const result = await this.db.query(
      `INSERT INTO company_profiles (name, industry, size, work_arrangement, location)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        data.name,
        data.industry,
        data.size || "startup",
        data.workArrangement || "hybrid",
        data.location || "Remote",
      ]
    );
    const companyId = result.rows[0].id;
    this.createdIds.companies.push(companyId);
    return companyId;
  }

  async createTestJob(data: any): Promise<string> {
    const result = await this.db.query(
      `INSERT INTO company_job_variants (company_profile_id, custom_title, is_active)
       VALUES ($1, $2, $3) RETURNING id`,
      [data.companyId, data.title, true]
    );
    const jobId = result.rows[0].id;
    this.createdIds.jobs.push(jobId);
    return jobId;
  }

  async createTestCandidate(data: any): Promise<string> {
    const [firstName, lastName] = data.name.split(" ");
    const result = await this.db.query(
      `INSERT INTO candidates (email, first_name, last_name, phone, location, consent_given, consent_date)
       VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP) RETURNING id`,
      [
        data.email,
        firstName,
        lastName || "",
        data.phone || "",
        data.location || "",
      ]
    );
    const candidateId = result.rows[0].id;
    this.createdIds.candidates.push(candidateId);
    return candidateId;
  }

  async createTestApplication(
    candidateId: string,
    jobId: string,
    options: any = {}
  ): Promise<string> {
    const result = await this.db.query(
      `INSERT INTO applications (candidate_id, company_job_variant_id, status, fit_score, applied_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        candidateId,
        jobId,
        options.stage || "applied",
        options.fitScore || Math.floor(Math.random() * 100),
        options.appliedAt || new Date(),
      ]
    );
    const applicationId = result.rows[0].id;
    this.createdIds.applications.push(applicationId);
    return applicationId;
  }

  private getRandomSkills(): string[] {
    const allSkills = [
      "JavaScript",
      "TypeScript",
      "React",
      "Vue.js",
      "Angular",
      "Node.js",
      "Python",
      "Java",
      "C#",
      "PHP",
      "SQL",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "AWS",
      "Docker",
      "Kubernetes",
      "Git",
      "HTML",
      "CSS",
      "Sass",
      "Tailwind",
    ];

    const skillCount = Math.floor(Math.random() * 8) + 3; // 3-10 skills
    const shuffled = allSkills.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, skillCount);
  }

  private getRandomStage(): string {
    const stages = [
      "applied",
      "screening",
      "shortlisted",
      "interview",
      "offer",
      "hired",
      "rejected",
    ];
    return stages[Math.floor(Math.random() * stages.length)];
  }

  private getRandomDate(): Date {
    const start = new Date(2024, 0, 1);
    const end = new Date();
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
  }

  private getRandomLocation(): string {
    const locations = [
      "New York, NY",
      "San Francisco, CA",
      "Austin, TX",
      "Seattle, WA",
      "Boston, MA",
      "Chicago, IL",
      "Denver, CO",
      "Remote",
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private async seedUsers() {
    const users = [
      {
        email: "admin@test.com",
        password: "testpassword123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      },
      {
        email: "recruiter@test.com",
        password: "testpassword123",
        firstName: "Recruiter",
        lastName: "User",
        role: "recruiter",
      },
      {
        email: "hiring-manager@test.com",
        password: "testpassword123",
        firstName: "Hiring",
        lastName: "Manager",
        role: "hiring_manager",
      },
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await this.db.query(
        `
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `,
        [user.email, hashedPassword, user.firstName, user.lastName, user.role]
      );
    }
  }

  private async seedJobFamilies() {
    const jobFamilies = [
      {
        name: "Software Engineer",
        description: "Software development roles across all levels",
        skillCategories: ["Programming", "Frameworks", "Databases", "DevOps"],
      },
      {
        name: "Product Manager",
        description: "Product management and strategy roles",
        skillCategories: [
          "Strategy",
          "Analytics",
          "Communication",
          "Leadership",
        ],
      },
      {
        name: "Data Scientist",
        description: "Data science and machine learning roles",
        skillCategories: [
          "Statistics",
          "Machine Learning",
          "Programming",
          "Visualization",
        ],
      },
    ];

    for (const family of jobFamilies) {
      await this.db.query(
        `
        INSERT INTO job_families (name, description, skill_categories)
        VALUES ($1, $2, $3)
      `,
        [family.name, family.description, family.skillCategories]
      );
    }
  }

  private async seedCandidates() {
    const candidates = [
      {
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        phone: "+1-555-0101",
        location: "San Francisco, CA",
        linkedinUrl: "https://linkedin.com/in/johndoe",
        portfolioUrl: "https://johndoe.dev",
      },
      {
        email: "jane.smith@example.com",
        firstName: "Jane",
        lastName: "Smith",
        phone: "+1-555-0102",
        location: "New York, NY",
        linkedinUrl: "https://linkedin.com/in/janesmith",
        portfolioUrl: "https://janesmith.com",
      },
      {
        email: "mike.johnson@example.com",
        firstName: "Mike",
        lastName: "Johnson",
        phone: "+1-555-0103",
        location: "Austin, TX",
        linkedinUrl: "https://linkedin.com/in/mikejohnson",
      },
    ];

    for (const candidate of candidates) {
      await this.db.query(
        `
        INSERT INTO candidates (email, first_name, last_name, phone, location, linkedin_url, portfolio_url, consent_given, consent_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
      `,
        [
          candidate.email,
          candidate.firstName,
          candidate.lastName,
          candidate.phone,
          candidate.location,
          candidate.linkedinUrl,
          candidate.portfolioUrl || null,
        ]
      );
    }
  }

  private async seedApplications() {
    // Get candidate IDs
    const candidatesResult = await this.db.query(
      "SELECT id FROM candidates LIMIT 3"
    );
    const candidateIds = candidatesResult.rows.map((row) => row.id);

    const applications = [
      {
        candidateId: candidateIds[0],
        status: "applied",
        fitScore: 85,
      },
      {
        candidateId: candidateIds[1],
        status: "shortlisted",
        fitScore: 92,
      },
      {
        candidateId: candidateIds[2],
        status: "interview_scheduled",
        fitScore: 78,
      },
    ];

    for (const application of applications) {
      await this.db.query(
        `
        INSERT INTO applications (candidate_id, status, fit_score)
        VALUES ($1, $2, $3)
      `,
        [application.candidateId, application.status, application.fitScore]
      );
    }
  }

  async cleanup() {
    // Clean up in reverse order to handle foreign key constraints
    for (const applicationId of this.createdIds.applications) {
      await this.db.query("DELETE FROM applications WHERE id = $1", [
        applicationId,
      ]);
    }

    for (const candidateId of this.createdIds.candidates) {
      await this.db.query("DELETE FROM candidates WHERE id = $1", [
        candidateId,
      ]);
    }

    for (const jobId of this.createdIds.jobs) {
      await this.db.query("DELETE FROM company_job_variants WHERE id = $1", [
        jobId,
      ]);
    }

    for (const companyId of this.createdIds.companies) {
      await this.db.query("DELETE FROM company_profiles WHERE id = $1", [
        companyId,
      ]);
    }

    // Reset tracking arrays
    this.createdIds = {
      candidates: [],
      jobs: [],
      applications: [],
      companies: [],
    };
  }

  async cleanupTestData() {
    await this.db.clearAllTables();
  }
}
