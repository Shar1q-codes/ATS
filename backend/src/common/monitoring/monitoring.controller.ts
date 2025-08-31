import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  getDashboard() {
    return this.monitoringService.getDashboardData();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get detailed service metrics' })
  @ApiResponse({
    status: 200,
    description: 'Service metrics retrieved successfully',
  })
  getMetrics() {
    return {
      metrics: this.monitoringService.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('restart-unhealthy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restart all unhealthy services' })
  @ApiResponse({ status: 200, description: 'Service restart attempted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async restartUnhealthyServices() {
    const result = await this.monitoringService.restartUnhealthyServices();
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}
