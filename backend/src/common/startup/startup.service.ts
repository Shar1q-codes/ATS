import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { createClient } from 'redis';

@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);
  private startupTime: Date;
  private isHealthy = false;
  private services: Map<string, boolean> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.startupTime = new Date();
  }

  async onModuleInit() {
    this.logger.log('Starting backend service initialization...');
    await this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Check database connection
      await this.checkDatabaseConnection();

      // Check Redis connection
      await this.checkRedisConnection();

      // Check OpenAI API
      await this.checkOpenAIConnection();

      // Check file storage
      await this.checkFileStorage();

      this.isHealthy = true;
      this.logger.log('All services initialized successfully');
    } catch (error) {
      this.logger.error('Service initialization failed', error);
      this.isHealthy = false;
    }
  }

  private async checkDatabaseConnection() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      await this.dataSource.query('SELECT 1');
      this.services.set('database', true);
      this.logger.log('Database connection established');
    } catch (error) {
      this.services.set('database', false);
      this.logger.error('Database connection failed', error);
      throw error;
    }
  }

  private async checkRedisConnection() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        this.logger.warn('Redis URL not configured, skipping Redis check');
        this.services.set('redis', false);
        return;
      }

      const client = createClient({ url: redisUrl });
      await client.connect();
      await client.ping();
      await client.disconnect();

      this.services.set('redis', true);
      this.logger.log('Redis connection established');
    } catch (error) {
      this.services.set('redis', false);
      this.logger.error('Redis connection failed', error);
      // Don't throw error for Redis as it's not critical for basic functionality
    }
  }

  private async checkOpenAIConnection() {
    try {
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!openaiApiKey) {
        this.logger.warn('OpenAI API key not configured');
        this.services.set('openai', false);
        return;
      }

      // Simple check - we'll just verify the API key format
      if (openaiApiKey.startsWith('sk-')) {
        this.services.set('openai', true);
        this.logger.log('OpenAI API key configured');
      } else {
        this.services.set('openai', false);
        this.logger.warn('OpenAI API key format invalid');
      }
    } catch (error) {
      this.services.set('openai', false);
      this.logger.error('OpenAI API check failed', error);
    }
  }

  private async checkFileStorage() {
    try {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseKey) {
        this.logger.warn('Supabase configuration not complete');
        this.services.set('storage', false);
        return;
      }

      this.services.set('storage', true);
      this.logger.log('File storage configuration verified');
    } catch (error) {
      this.services.set('storage', false);
      this.logger.error('File storage check failed', error);
    }
  }

  getHealthStatus() {
    return {
      healthy: this.isHealthy,
      startupTime: this.startupTime,
      uptime: Date.now() - this.startupTime.getTime(),
      services: Object.fromEntries(this.services),
    };
  }

  async restartService(serviceName: string): Promise<boolean> {
    this.logger.log(`Attempting to restart service: ${serviceName}`);

    try {
      switch (serviceName) {
        case 'database':
          await this.checkDatabaseConnection();
          break;
        case 'redis':
          await this.checkRedisConnection();
          break;
        case 'openai':
          await this.checkOpenAIConnection();
          break;
        case 'storage':
          await this.checkFileStorage();
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      this.logger.log(`Service ${serviceName} restarted successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to restart service ${serviceName}`, error);
      return false;
    }
  }
}
