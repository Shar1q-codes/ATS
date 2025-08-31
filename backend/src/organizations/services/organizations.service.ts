import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    const organization = this.organizationRepository.create(
      createOrganizationDto,
    );
    return this.organizationRepository.save(organization);
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    // Verify user has admin access to this organization
    await this.validateAdminAccess(id, userId);

    await this.organizationRepository.update(id, updateOrganizationDto);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    // Verify user has admin access to this organization
    await this.validateAdminAccess(id, userId);

    const result = await this.organizationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
  }

  async getOrganizationUsers(
    organizationId: string,
    requestingUserId: string,
  ): Promise<User[]> {
    // Verify user belongs to this organization
    await this.validateUserAccess(organizationId, requestingUserId);

    return this.userRepository.find({
      where: { organizationId },
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
  }

  async updateUserRole(
    organizationId: string,
    userId: string,
    newRole: UserRole,
    requestingUserId: string,
  ): Promise<User> {
    // Verify requesting user has admin access
    await this.validateAdminAccess(organizationId, requestingUserId);

    // Verify target user belongs to the organization
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found in this organization');
    }

    user.role = newRole;
    return this.userRepository.save(user);
  }

  async removeUserFromOrganization(
    organizationId: string,
    userId: string,
    requestingUserId: string,
  ): Promise<void> {
    // Verify requesting user has admin access
    await this.validateAdminAccess(organizationId, requestingUserId);

    // Don't allow removing self
    if (userId === requestingUserId) {
      throw new ForbiddenException(
        'Cannot remove yourself from the organization',
      );
    }

    const result = await this.userRepository.delete({
      id: userId,
      organizationId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('User not found in this organization');
    }
  }

  private async validateAdminAccess(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new ForbiddenException(
        'Access denied: User does not belong to this organization',
      );
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied: Admin role required');
    }
  }

  private async validateUserAccess(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new ForbiddenException(
        'Access denied: User does not belong to this organization',
      );
    }
  }

  async getOrganizationStats(
    organizationId: string,
    userId: string,
  ): Promise<any> {
    // Verify user belongs to this organization
    await this.validateUserAccess(organizationId, userId);

    const [userCount] = await Promise.all([
      this.userRepository.count({ where: { organizationId } }),
    ]);

    return {
      userCount,
      // Add more stats as needed
    };
  }
}
