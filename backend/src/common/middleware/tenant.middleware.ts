import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Allow unauthenticated requests to pass through
        // Authentication will be handled by guards
        return next();
      }

      const token = authHeader.substring(7);
      const payload = this.jwtService.verify(token);

      if (payload.organizationId) {
        req.tenantId = payload.organizationId;
        req.userId = payload.sub;
        req.userRole = payload.role;
      }

      next();
    } catch (error) {
      // Don't throw error here, let authentication guards handle it
      next();
    }
  }
}
