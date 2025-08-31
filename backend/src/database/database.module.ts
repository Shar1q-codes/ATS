import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'ai_native_ats'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false, // Always use migrations in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        // Connection pooling configuration
        extra: {
          max: configService.get('DB_POOL_MAX', 20), // Maximum number of connections
          min: configService.get('DB_POOL_MIN', 5), // Minimum number of connections
          acquire: configService.get('DB_POOL_ACQUIRE', 30000), // Maximum time to get connection
          idle: configService.get('DB_POOL_IDLE', 10000), // Maximum time connection can be idle
          evict: configService.get('DB_POOL_EVICT', 60000), // Time to run eviction
          handleDisconnects: true,
          // Connection pool monitoring
          log: configService.get('NODE_ENV') === 'development',
        },
        // Query result caching
        cache: {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_QUERY_CACHE_DB', 2),
          },
          duration: configService.get('QUERY_CACHE_DURATION', 30000), // 30 seconds
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
