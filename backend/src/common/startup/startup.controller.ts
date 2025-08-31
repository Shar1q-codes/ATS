import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StartupService } from './startup.service';

@ApiTags('Startup & Health')
@Controller('startup')
export class StartupController {
  constructor(private readonly startupService: StartupService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get service startup status' })
  @ApiResponse({
    status: 200,
    description: 'Service status retrieved successfully',
  })
  getStatus() {
    return this.startupService.getHealthStatus();
  }

  @Post('restart/:service')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restart a specific service' })
  @ApiResponse({ status: 200, description: 'Service restart attempted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async restartService(@Param('service') service: string) {
    const success = await this.startupService.restartService(service);
    return {
      service,
      restarted: success,
      timestamp: new Date().toISOString(),
    };
  }
}
