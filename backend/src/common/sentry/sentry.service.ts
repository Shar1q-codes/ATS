import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { httpIntegration, expressIntegration } from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const sentryDsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        environment,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        integrations: [
          httpIntegration({ tracing: true }),
          expressIntegration(),
        ],
      });
    }
  }

  captureException(exception: any, context?: string) {
    if (context) {
      Sentry.setContext('error_context', { context });
    }
    Sentry.captureException(exception);
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; role?: string }) {
    Sentry.setUser(user);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
