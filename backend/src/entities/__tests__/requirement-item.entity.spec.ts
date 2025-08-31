import { validate } from 'class-validator';
import {
  RequirementItem,
  RequirementType,
  RequirementCategory,
} from '../requirement-item.entity';

describe('RequirementItem Entity', () => {
  let requirementItem: RequirementItem;

  beforeEach(() => {
    requirementItem = new RequirementItem();
    requirementItem.type = RequirementType.SKILL;
    requirementItem.category = RequirementCategory.MUST;
    requirementItem.description = 'Proficiency in JavaScript';
    requirementItem.weight = 8;
    requirementItem.alternatives = ['TypeScript', 'ES6+'];
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty description', async () => {
      requirementItem.description = '';
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('description');
    });

    it('should fail validation with weight below minimum', async () => {
      requirementItem.weight = 0;
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('weight');
    });

    it('should fail validation with weight above maximum', async () => {
      requirementItem.weight = 11;
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('weight');
    });

    it('should pass validation with weight at boundaries', async () => {
      requirementItem.weight = 1;
      let errors = await validate(requirementItem);
      expect(errors).toHaveLength(0);

      requirementItem.weight = 10;
      errors = await validate(requirementItem);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid type enum', async () => {
      (requirementItem as any).type = 'invalid_type';
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('type');
    });

    it('should fail validation with invalid category enum', async () => {
      (requirementItem as any).category = 'invalid_category';
      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('category');
    });

    it('should pass validation with optional fields as undefined', async () => {
      requirementItem.type = undefined;
      requirementItem.category = undefined;
      requirementItem.alternatives = undefined;
      requirementItem.jobTemplateId = undefined;
      requirementItem.companyJobVariantId = undefined;

      const errors = await validate(requirementItem);
      expect(errors).toHaveLength(0);
    });
  });

  describe('enum values', () => {
    it('should contain all expected RequirementType values', () => {
      expect(Object.values(RequirementType)).toEqual([
        'skill',
        'experience',
        'education',
        'certification',
        'other',
      ]);
    });

    it('should contain all expected RequirementCategory values', () => {
      expect(Object.values(RequirementCategory)).toEqual([
        'must',
        'should',
        'nice',
      ]);
    });
  });

  describe('default values', () => {
    it('should have default weight of 5', () => {
      const newRequirement = new RequirementItem();
      expect(newRequirement.weight).toBeUndefined(); // Default is set at database level
    });
  });

  describe('relationships', () => {
    it('should allow setting jobTemplateId', () => {
      const templateId = 'template-uuid';
      requirementItem.jobTemplateId = templateId;
      expect(requirementItem.jobTemplateId).toBe(templateId);
    });

    it('should allow setting companyJobVariantId', () => {
      const variantId = 'variant-uuid';
      requirementItem.companyJobVariantId = variantId;
      expect(requirementItem.companyJobVariantId).toBe(variantId);
    });
  });
});
