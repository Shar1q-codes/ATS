import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant.middleware';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenantId;
  },
);

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.userId;
  },
);

export const UserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.userRole;
  },
);
