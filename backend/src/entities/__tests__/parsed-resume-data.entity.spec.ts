import { validate } from 'class-validator';
import {
  ParsedResumeData,
  Skill,
  WorkExperience,
  Education,
  Certification,
} from '../parsed-resume-data.entity';

describe('ParsedResumeData Entity', () => {
  let parsedResumeData: ParsedResumeData;

  beforeEach(() => {
    parsedResumeData = new ParsedResumeData();
    parsedResumeData.candidateId = 'candidate-uuid';
    parsedResumeData.summary = 'Experienced software developer';
    parsedResumeData.rawText = 'Raw resume text content';
    parsedResumeData.parsingConfidence = 0.95;
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with parsing confidence below minimum', async () => {
      parsedResumeData.parsingConfidence = -0.1;
      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('parsingConfidence');
    });

    it('should fail validation with parsing confidence above maximum', async () => {
      parsedResumeData.parsingConfidence = 1.1;
      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('parsingConfidence');
    });

    it('should pass validation with parsing confidence at boundaries', async () => {
      parsedResumeData.parsingConfidence = 0;
      let errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);

      parsedResumeData.parsingConfidence = 1;
      errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all optional fields as undefined', async () => {
      parsedResumeData.skills = undefined;
      parsedResumeData.experience = undefined;
      parsedResumeData.education = undefined;
      parsedResumeData.certifications = undefined;
      parsedResumeData.summary = undefined;
      parsedResumeData.rawText = undefined;
      parsedResumeData.parsingConfidence = undefined;

      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Skill nested object validation', () => {
    it('should validate skills array correctly', async () => {
      const skill = new Skill();
      skill.name = 'JavaScript';
      skill.category = 'Programming Language';
      skill.proficiency = 8;
      skill.yearsOfExperience = 5;

      parsedResumeData.skills = [skill];

      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid skill proficiency', async () => {
      const skill = new Skill();
      skill.name = 'JavaScript';
      skill.proficiency = 11; // Above maximum

      parsedResumeData.skills = [skill];

      const errors = await validate(parsedResumeData);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('WorkExperience nested object validation', () => {
    it('should validate experience array correctly', async () => {
      const experience = new WorkExperience();
      experience.company = 'Tech Corp';
      experience.position = 'Software Engineer';
      experience.description = 'Developed web applications';
      experience.startDate = new Date('2020-01-01');
      experience.endDate = new Date('2023-01-01');
      experience.technologies = ['JavaScript', 'React'];

      parsedResumeData.experience = [experience];

      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty company name', async () => {
      const experience = new WorkExperience();
      experience.company = '';
      experience.position = 'Software Engineer';

      parsedResumeData.experience = [experience];

      const errors = await validate(parsedResumeData);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Education nested object validation', () => {
    it('should validate education array correctly', async () => {
      const education = new Education();
      education.institution = 'University of Technology';
      education.degree = 'Bachelor of Science';
      education.fieldOfStudy = 'Computer Science';
      education.startDate = new Date('2016-09-01');
      education.endDate = new Date('2020-05-01');
      education.gpa = '3.8';

      parsedResumeData.education = [education];

      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty institution', async () => {
      const education = new Education();
      education.institution = '';
      education.degree = 'Bachelor of Science';

      parsedResumeData.education = [education];

      const errors = await validate(parsedResumeData);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Certification nested object validation', () => {
    it('should validate certifications array correctly', async () => {
      const certification = new Certification();
      certification.name = 'AWS Certified Developer';
      certification.issuer = 'Amazon Web Services';
      certification.issueDate = new Date('2022-01-01');
      certification.expirationDate = new Date('2025-01-01');
      certification.credentialId = 'AWS-123456';
      certification.credentialUrl =
        'https://aws.amazon.com/verification/123456';

      parsedResumeData.certifications = [certification];

      const errors = await validate(parsedResumeData);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty certification name', async () => {
      const certification = new Certification();
      certification.name = '';
      certification.issuer = 'Amazon Web Services';

      parsedResumeData.certifications = [certification];

      const errors = await validate(parsedResumeData);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
