import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { JobsModule } from '../src/jobs/jobs.module';
import { AuthModule } from '../src/auth/auth.module';
import { User, UserRole } from '../src/entities/user.entity';
import { JobFamily } from '../src/entities/job-family.entity';
import { JobTemplate, JobLevel } from '../src/entities/job-template.entity';
import {
  CompanyProfile,
  CompanySize,
  WorkArrangement,
} from '../src/entities/company-profile.entity';
import {
  RequirementItem,
  RequirementType,
  RequirementCategory,
} from '../src/entities/requirement-item.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Jobs API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let jobFamilyRepository: Repository<JobFamily>;
  let jobTemplateRepository: Repository<JobTemplate>;
  let companyProfileRepository: Repository<CompanyProfile>;
  let requirementItemRepository: Repository<RequirementItem>;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            JobFamily,
            JobTemplate,
            CompanyProfile,
            RequirementItem,
          ],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([
          User,
          JobFamily,
          JobTemplate,
          CompanyProfile,
          RequirementItem,
        ]),
        AuthModule,
        JobsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    jobFamilyRepository = moduleFixture.get<Repository<JobFamily>>(
      getRepositoryToken(JobFamily),
    );
    jobTemplateRepository = moduleFixture.get<Repository<JobTemplate>>(
      getRepositoryToken(JobTemplate),
    );
    companyProfileRepository = moduleFixture.get<Repository<CompanyProfile>>(
      getRepositoryToken(CompanyProfile),
    );
    requirementItemRepository = moduleFixture.get<Repository<RequirementItem>>(
      getRepositoryToken(RequirementItem),
    );

    await app.init();

    // Create test user and get access token
    const registerDto = {
      email: 'jobs@example.com',
      password: 'password123',
      firstName: 'Jobs',
      lastName: 'User',
      role: UserRole.RECRUITER,
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto);

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up job-related data before each test
    await requirementItemRepository.clear();
    await jobTemplateRepository.clear();
    await jobFamilyRepository.clear();
    await companyProfileRepository.clear();
  });

  describe('/job-families (POST)', () => {
    it('should create a new job family', async () => {
      const createDto = {
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming', 'Problem Solving'],
      };

      const response = await request(app.getHttpServer())
        .post('/job-families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createDto.name,
        description: createDto.description,
        skillCategories: createDto.skillCategories,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify in database
      const jobFamily = await jobFamilyRepository.findOne({
        where: { id: response.body.id },
      });
      expect(jobFamily).toBeDefined();
      expect(jobFamily?.name).toBe(createDto.name);
    });

    it('should return 401 without authorization', async () => {
      const createDto = {
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      };

      await request(app.getHttpServer())
        .post('/job-families')
        .send(createDto)
        .expect(401);
    });

    it('should return 400 for invalid input', async () => {
      const invalidDto = {
        name: '', // Empty name
        description: 'Description',
      };

      await request(app.getHttpServer())
        .post('/job-families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/job-families (GET)', () => {
    beforeEach(async () => {
      // Create test job families
      const jobFamily1 = jobFamilyRepository.create({
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
      const jobFamily2 = jobFamilyRepository.create({
        name: 'Data Scientist',
        description: 'Data science roles',
        skillCategories: ['Analytics', 'Machine Learning'],
      });
      await jobFamilyRepository.save([jobFamily1, jobFamily2]);
    });

    it('should return all job families', async () => {
      const response = await request(app.getHttpServer())
        .get('/job-families')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('skillCategories');
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer()).get('/job-families').expect(401);
    });
  });

  describe('/job-families/:id (GET)', () => {
    let jobFamilyId: string;

    beforeEach(async () => {
      const jobFamily = jobFamilyRepository.create({
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
      const saved = await jobFamilyRepository.save(jobFamily);
      jobFamilyId = saved.id;
    });

    it('should return job family by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/job-families/${jobFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobFamilyId,
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
    });

    it('should return 404 for non-existent job family', async () => {
      await request(app.getHttpServer())
        .get('/job-families/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer())
        .get(`/job-families/${jobFamilyId}`)
        .expect(401);
    });
  });

  describe('/job-families/:id (PUT)', () => {
    let jobFamilyId: string;

    beforeEach(async () => {
      const jobFamily = jobFamilyRepository.create({
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
      const saved = await jobFamilyRepository.save(jobFamily);
      jobFamilyId = saved.id;
    });

    it('should update job family', async () => {
      const updateDto = {
        name: 'Updated Software Engineer',
        description: 'Updated description',
        skillCategories: ['Programming', 'Architecture'],
      };

      const response = await request(app.getHttpServer())
        .put(`/job-families/${jobFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobFamilyId,
        name: updateDto.name,
        description: updateDto.description,
        skillCategories: updateDto.skillCategories,
      });

      // Verify in database
      const updated = await jobFamilyRepository.findOne({
        where: { id: jobFamilyId },
      });
      expect(updated?.name).toBe(updateDto.name);
    });

    it('should return 404 for non-existent job family', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put('/job-families/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put(`/job-families/${jobFamilyId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('/job-families/:id (DELETE)', () => {
    let jobFamilyId: string;

    beforeEach(async () => {
      const jobFamily = jobFamilyRepository.create({
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
      const saved = await jobFamilyRepository.save(jobFamily);
      jobFamilyId = saved.id;
    });

    it('should delete job family', async () => {
      await request(app.getHttpServer())
        .delete(`/job-families/${jobFamilyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion in database
      const deleted = await jobFamilyRepository.findOne({
        where: { id: jobFamilyId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent job family', async () => {
      await request(app.getHttpServer())
        .delete('/job-families/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      await request(app.getHttpServer())
        .delete(`/job-families/${jobFamilyId}`)
        .expect(401);
    });
  });

  describe('/company-profiles (POST)', () => {
    it('should create a new company profile', async () => {
      const createDto = {
        name: 'TechCorp',
        industry: 'Technology',
        size: CompanySize.MEDIUM,
        culture: ['Innovation', 'Collaboration'],
        benefits: ['Health Insurance', 'Remote Work'],
        workArrangement: WorkArrangement.HYBRID,
        location: 'San Francisco, CA',
        preferences: {
          prioritySkills: ['JavaScript', 'React'],
          dealBreakers: ['No experience'],
          niceToHave: ['TypeScript'],
        },
      };

      const response = await request(app.getHttpServer())
        .post('/company-profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createDto.name,
        industry: createDto.industry,
        size: createDto.size,
        culture: createDto.culture,
        benefits: createDto.benefits,
        workArrangement: createDto.workArrangement,
        location: createDto.location,
        preferences: createDto.preferences,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');

      // Verify in database
      const companyProfile = await companyProfileRepository.findOne({
        where: { id: response.body.id },
      });
      expect(companyProfile).toBeDefined();
      expect(companyProfile?.name).toBe(createDto.name);
    });

    it('should return 401 without authorization', async () => {
      const createDto = {
        name: 'TechCorp',
        industry: 'Technology',
        size: CompanySize.MEDIUM,
      };

      await request(app.getHttpServer())
        .post('/company-profiles')
        .send(createDto)
        .expect(401);
    });
  });

  describe('/job-templates (POST)', () => {
    let jobFamilyId: string;

    beforeEach(async () => {
      const jobFamily = jobFamilyRepository.create({
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      });
      const saved = await jobFamilyRepository.save(jobFamily);
      jobFamilyId = saved.id;
    });

    it('should create a new job template with requirements', async () => {
      const createDto = {
        jobFamilyId,
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 3,
        experienceRangeMax: 7,
        salaryRangeMin: 80000,
        salaryRangeMax: 120000,
        salaryCurrency: 'USD',
        requirements: [
          {
            type: RequirementType.SKILL,
            category: RequirementCategory.MUST,
            description: 'JavaScript proficiency',
            weight: 8,
            alternatives: ['TypeScript'],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/job-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        jobFamilyId,
        name: createDto.name,
        level: createDto.level,
        experienceRangeMin: createDto.experienceRangeMin,
        experienceRangeMax: createDto.experienceRangeMax,
        salaryRangeMin: createDto.salaryRangeMin,
        salaryRangeMax: createDto.salaryRangeMax,
        salaryCurrency: createDto.salaryCurrency,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body.requirements).toHaveLength(1);
      expect(response.body.requirements[0]).toMatchObject({
        type: createDto.requirements[0].type,
        category: createDto.requirements[0].category,
        description: createDto.requirements[0].description,
        weight: createDto.requirements[0].weight,
      });

      // Verify in database
      const jobTemplate = await jobTemplateRepository.findOne({
        where: { id: response.body.id },
        relations: ['requirements'],
      });
      expect(jobTemplate).toBeDefined();
      expect(jobTemplate?.requirements).toHaveLength(1);
    });

    it('should return 400 for invalid experience range', async () => {
      const createDto = {
        jobFamilyId,
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 7,
        experienceRangeMax: 3, // Invalid: min > max
      };

      await request(app.getHttpServer())
        .post('/job-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 404 for non-existent job family', async () => {
      const createDto = {
        jobFamilyId: 'non-existent-id',
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
      };

      await request(app.getHttpServer())
        .post('/job-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(404);
    });

    it('should return 401 without authorization', async () => {
      const createDto = {
        jobFamilyId,
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
      };

      await request(app.getHttpServer())
        .post('/job-templates')
        .send(createDto)
        .expect(401);
    });
  });

  describe('Data persistence and relationships', () => {
    it('should maintain relationships between job family and templates', async () => {
      // Create job family
      const jobFamilyDto = {
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      };

      const jobFamilyResponse = await request(app.getHttpServer())
        .post('/job-families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(jobFamilyDto);

      const jobFamilyId = jobFamilyResponse.body.id;

      // Create job template
      const jobTemplateDto = {
        jobFamilyId,
        name: 'Senior Software Engineer',
        level: JobLevel.SENIOR,
        experienceRangeMin: 3,
        experienceRangeMax: 7,
      };

      const jobTemplateResponse = await request(app.getHttpServer())
        .post('/job-templates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(jobTemplateDto);

      // Verify relationship in database
      const jobTemplate = await jobTemplateRepository.findOne({
        where: { id: jobTemplateResponse.body.id },
        relations: ['jobFamily'],
      });

      expect(jobTemplate).toBeDefined();
      expect(jobTemplate?.jobFamily).toBeDefined();
      expect(jobTemplate?.jobFamily.id).toBe(jobFamilyId);
      expect(jobTemplate?.jobFamily.name).toBe(jobFamilyDto.name);
    });

    it('should handle concurrent job family creation', async () => {
      const createDto1 = {
        name: 'Software Engineer',
        description: 'Software engineering roles',
        skillCategories: ['Programming'],
      };

      const createDto2 = {
        name: 'Data Scientist',
        description: 'Data science roles',
        skillCategories: ['Analytics'],
      };

      // Create both job families concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .post('/job-families')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto1),
        request(app.getHttpServer())
          .post('/job-families')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(createDto2),
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Verify both exist in database
      const jobFamilies = await jobFamilyRepository.find();
      expect(jobFamilies).toHaveLength(2);

      const names = jobFamilies.map((jf) => jf.name);
      expect(names).toContain(createDto1.name);
      expect(names).toContain(createDto2.name);
    });
  });
});
