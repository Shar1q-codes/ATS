import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId, UserId } from '../../common/decorators/tenant.decorator';
import { UserRole } from '../../entities/user.entity';
import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    // Users can only access their own organization
    if (id !== tenantId) {
      return this.organizationsService.findOne(tenantId);
    }
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ) {
    // Users can only update their own organization
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.update(
      organizationId,
      updateOrganizationDto,
      userId,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ) {
    // Users can only delete their own organization
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.remove(organizationId, userId);
  }

  @Get(':id/users')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECRUITER, UserRole.HIRING_MANAGER)
  getUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ) {
    // Users can only access users from their own organization
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.getOrganizationUsers(
      organizationId,
      userId,
    );
  }

  @Patch(':id/users/:userId/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body('role') newRole: UserRole,
    @UserId() requestingUserId: string,
    @TenantId() tenantId: string,
  ) {
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.updateUserRole(
      organizationId,
      targetUserId,
      newRole,
      requestingUserId,
    );
  }

  @Delete(':id/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @UserId() requestingUserId: string,
    @TenantId() tenantId: string,
  ) {
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.removeUserFromOrganization(
      organizationId,
      targetUserId,
      requestingUserId,
    );
  }

  @Get(':id/stats')
  getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
    @TenantId() tenantId: string,
  ) {
    const organizationId = id === tenantId ? id : tenantId;
    return this.organizationsService.getOrganizationStats(
      organizationId,
      userId,
    );
  }
}
