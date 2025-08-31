import { validate } from 'class-validator';
import {
  CompanyProfile,
  CompanySize,
  WorkArrangement,
  CompanyPreferences,
} from '../company-profile.entity';

describe('CompanyProfile Entity', () => {
  let companyProfile: CompanyProfile;

  beforeEach(() => {
    companyProfile = new CompanyProfile();
    companyProfile.name = 'Tech Corp';
    companyProfile.industry = 'Technology';
    companyProfile.size = CompanySize.STARTUP;
    companyProfile.culture = ['innovative', 'collaborative'];
    companyProfile.benefits = ['health insurance', 'flexible hours'];
    companyProfile.workArrangement = WorkArrangement.HYBRID;
    companyProfile.location = 'San Francisco, CA';
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty name', async () => {
      companyProfile.name = '';
      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('should pass validation with optional fields as null', async () => {
      companyProfile.industry = undefined;
      companyProfile.size = undefined;
      companyProfile.culture = undefined;
      companyProfile.benefits = undefined;
      companyProfile.workArrangement = undefined;
      companyProfile.location = undefined;
      companyProfile.preferences = undefined;

      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid size enum', async () => {
      (companyProfile as any).size = 'invalid_size';
      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('size');
    });

    it('should fail validation with invalid work arrangement enum', async () => {
      (companyProfile as any).workArrangement = 'invalid_arrangement';
      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('workArrangement');
    });
  });

  describe('CompanyPreferences validation', () => {
    it('should validate preferences object correctly', async () => {
      const preferences = new CompanyPreferences();
      preferences.prioritySkills = ['JavaScript', 'React'];
      preferences.dealBreakers = ['No remote work'];
      preferences.niceToHave = ['GraphQL', 'TypeScript'];

      companyProfile.preferences = preferences;

      const errors = await validate(companyProfile);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid preferences arrays', async () => {
      const preferences = new CompanyPreferences();
      (preferences as any).prioritySkills = ['JavaScript', 123]; // Invalid: number in string array
      (preferences as any).dealBreakers = 'not an array'; // Invalid: not an array
      preferences.niceToHave = ['GraphQL'];

      companyProfile.preferences = preferences;

      const errors = await validate(companyProfile);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('enum values', () => {
    it('should contain all expected CompanySize values', () => {
      expect(Object.values(CompanySize)).toEqual([
        'startup',
        'small',
        'medium',
        'large',
        'enterprise',
      ]);
    });

    it('should contain all expected WorkArrangement values', () => {
      expect(Object.values(WorkArrangement)).toEqual([
        'remote',
        'hybrid',
        'onsite',
      ]);
    });
  });
});
