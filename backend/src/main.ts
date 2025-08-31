import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { winstonConfig } from './common/logging/winston.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SentryService } from './common/sentry/sentry.service';
import {
  validateEnvironment,
  getCorsOrigin,
  isDevelopment,
} from './common/config/env-validation';

async function bootstrap() {
  // Validate environment configuration first
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Initialize Sentry
  const sentryService = app.get(SentryService);

  // Enable CORS with enhanced configuration
  const corsOrigin = getCorsOrigin();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: isDevelopment() ? 0 : 86400, // Cache preflight for 24h in production
  });

  if (isDevelopment()) {
    console.log(`[CORS] Configured for origin: ${corsOrigin}`);
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(sentryService));

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI-Native ATS API')
      .setDescription('API documentation for AI-Native ATS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
  console.log(`API Tester: http://localhost:${port}/api-tester.html`);
  console.log(`Health Check: http://localhost:${port}/api/health`);
}
void bootstrap();
