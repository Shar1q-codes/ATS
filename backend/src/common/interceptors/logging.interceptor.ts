import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SentryService } from '../sentry/sentry.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();

    // Add breadcrumb for Sentry
    this.sentryService.addBreadcrumb({
      message: `${method} ${url}`,
      category: 'http',
      level: 'info',
      data: {
        method,
        url,
        userId: user?.id,
      },
    });

    this.logger.log(`Incoming Request: ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${responseTime}ms`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `Request Error: ${method} ${url} - ${responseTime}ms - ${error.message}`,
          );
          this.sentryService.captureException(error, `${method} ${url}`);
        },
      }),
    );
  }
}
