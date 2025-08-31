import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from '../services/organizations.service';
import {
  Organization,
  OrganizationType,
  SubscriptionPlan,
} from '../../entities/organization.entity';
import { User, UserRole } from '../../entities/user.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    type: OrganizationType.SMB,
    subscriptionPlan: SubscriptionPlan.FREE,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
    companies: [],
    jobFamilies: [],
    candidates: [],
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'admin@test.com',
    passwordHash: 'hashed',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    organizationId: 'org-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: mockOrganization,
    jdVersions: [],
    applicationNotes: [],
    stageHistoryEntries: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(getRepositoryToken(Organization));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a new organization', async () => {
      const createDto = {
        name: 'New Organization',
        type: OrganizationType.STARTUP,
      };

      organizationRepository.create.mockReturnValue(mockOrganization);
      organizationRepository.save.mockResolvedValue(mockOrganization);

      const result = await service.create(createDto);

      expect(organizationRepository.create).toHaveBeenCalledWith(createDto);
      expect(organizationRepository.save).toHaveBeenCalledWith(
        mockOrganization,
      );
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('findOne', () => {
    it('should return organization when found', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findOne('org-1');

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        relations: ['users'],
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update organization when user has admin access', async () => {
      const updateDto = { name: 'Updated Organization' };
      userRepository.findOne.mockResolvedValue(mockUser);
      organizationRepository.update.mockResolvedValue({ affected: 1 } as any);
      organizationRepository.findOne.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      const result = await service.update('org-1', updateDto, 'user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', organizationId: 'org-1' },
      });
      expect(organizationRepository.update).toHaveBeenCalledWith(
        'org-1',
        updateDto,
      );
      expect(result).toEqual({ ...mockOrganization, ...updateDto });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      const nonAdminUser = { ...mockUser, role: UserRole.RECRUITER };
      userRepository.findOne.mockResolvedValue(nonAdminUser);

      await expect(
        service.update('org-1', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not belong to organization', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('org-1', { name: 'Updated' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove organization when user has admin access', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      organizationRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('org-1', 'user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', organizationId: 'org-1' },
      });
      expect(organizationRepository.delete).toHaveBeenCalledWith('org-1');
    });

    it('should throw NotFoundException when organization not found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      organizationRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove('org-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrganizationUsers', () => {
    it('should return users when user belongs to organization', async () => {
      const mockUsers = [mockUser];
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.find.mockResolvedValue(mockUsers);

      const result = await service.getOrganizationUsers('org-1', 'user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', organizationId: 'org-1' },
      });
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'createdAt',
        ],
      });
      expect(result).toEqual(mockUsers);
    });

    it('should throw ForbiddenException when user does not belong to organization', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getOrganizationUsers('org-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role when requesting user is admin', async () => {
      const targetUser = {
        ...mockUser,
        id: 'user-2',
        role: UserRole.RECRUITER,
      };
      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // requesting user
        .mockResolvedValueOnce(targetUser); // target user
      userRepository.save.mockResolvedValue({
        ...targetUser,
        role: UserRole.ADMIN,
      });

      const result = await service.updateUserRole(
        'org-1',
        'user-2',
        UserRole.ADMIN,
        'user-1',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1', organizationId: 'org-1' },
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-2', organizationId: 'org-1' },
      });
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw ForbiddenException when requesting user is not admin', async () => {
      const nonAdminUser = { ...mockUser, role: UserRole.RECRUITER };
      userRepository.findOne.mockResolvedValue(nonAdminUser);

      await expect(
        service.updateUserRole('org-1', 'user-2', UserRole.ADMIN, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when target user not found', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(mockUser) // requesting user
        .mockResolvedValueOnce(null); // target user not found

      await expect(
        service.updateUserRole('org-1', 'user-2', UserRole.ADMIN, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUserFromOrganization', () => {
    it('should remove user when requesting user is admin', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeUserFromOrganization('org-1', 'user-2', 'user-1');

      expect(userRepository.delete).toHaveBeenCalledWith({
        id: 'user-2',
        organizationId: 'org-1',
      });
    });

    it('should throw ForbiddenException when trying to remove self', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.removeUserFromOrganization('org-1', 'user-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(
        service.removeUserFromOrganization('org-1', 'user-2', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization statistics', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.count.mockResolvedValue(5);

      const result = await service.getOrganizationStats('org-1', 'user-1');

      expect(userRepository.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
      expect(result).toEqual({ userCount: 5 });
    });

    it('should throw ForbiddenException when user does not belong to organization', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getOrganizationStats('org-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
