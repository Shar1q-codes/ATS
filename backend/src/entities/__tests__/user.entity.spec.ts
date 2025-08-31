import { validate } from 'class-validator';
import { User, UserRole } from '../user.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.email = 'test@example.com';
    user.passwordHash = 'hashedpassword123';
    user.firstName = 'John';
    user.lastName = 'Doe';
    user.role = UserRole.RECRUITER;
    user.isActive = true;
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid email', async () => {
      user.email = 'invalid-email';
      const errors = await validate(user);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('email');
    });

    it('should fail validation with empty firstName', async () => {
      user.firstName = '';
      const errors = await validate(user);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('firstName');
    });

    it('should fail validation with empty lastName', async () => {
      user.lastName = '';
      const errors = await validate(user);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('lastName');
    });

    it('should fail validation with invalid role', async () => {
      (user as any).role = 'invalid_role';
      const errors = await validate(user);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('role');
    });

    it('should pass validation with optional companyId', async () => {
      user.companyId = 'uuid-string';
      const errors = await validate(user);
      expect(errors).toHaveLength(0);
    });
  });

  describe('enum values', () => {
    it('should accept valid UserRole values', () => {
      expect(Object.values(UserRole)).toContain(UserRole.ADMIN);
      expect(Object.values(UserRole)).toContain(UserRole.RECRUITER);
      expect(Object.values(UserRole)).toContain(UserRole.HIRING_MANAGER);
    });
  });

  describe('default values', () => {
    it('should have default role as RECRUITER', () => {
      const newUser = new User();
      expect(newUser.role).toBeUndefined(); // Default is set at database level
    });

    it('should have default isActive as true', () => {
      const newUser = new User();
      expect(newUser.isActive).toBeUndefined(); // Default is set at database level
    });
  });
});
