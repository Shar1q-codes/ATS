import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import {
  NotificationService,
  NotificationPreferences,
} from '../services/notification.service';
import { NotificationType } from '../../entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('type') type?: NotificationType,
  ) {
    const { notifications, total } =
      await this.notificationService.getUserNotifications(
        req.user.id,
        req.user.tenantId,
        {
          limit: limit ? parseInt(limit.toString()) : undefined,
          offset: offset ? parseInt(offset.toString()) : undefined,
          unreadOnly: unreadOnly === 'true',
          type,
        },
      );

    return {
      success: true,
      data: {
        notifications,
        total,
        hasMore: (offset || 0) + notifications.length < total,
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationService.getUnreadNotificationCount(
      req.user.id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: { count },
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Request() req, @Param('id') notificationId: string) {
    await this.notificationService.markNotificationAsRead(
      notificationId,
      req.user.id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req) {
    await this.notificationService.markAllNotificationsAsRead(
      req.user.id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(
    @Request() req,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.deleteNotification(
      notificationId,
      req.user.id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(@Request() req) {
    const preferences =
      await this.notificationService.getUserNotificationPreferences(
        req.user.id,
        req.user.tenantId,
      );

    return {
      success: true,
      data: preferences,
    };
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Request() req,
    @Body() preferences: Partial<NotificationPreferences>,
  ) {
    await this.notificationService.updateUserNotificationPreferences(
      req.user.id,
      req.user.tenantId,
      preferences,
    );

    return {
      success: true,
      message: 'Notification preferences updated',
    };
  }
}
