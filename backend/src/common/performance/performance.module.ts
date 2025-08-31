import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { OpenAIOptimizationService } from './openai-optimization.service';
import { QueueOptimizationService } from './queue-optimization.service';
import { PaginationService } from './pagination.service';
import { CompressionInterceptor } from './compression.interceptor';
import { PerformanceController } from './performance.controller';

@Global()
@Module({
  controllers: [PerformanceController],
  providers: [
    CacheService,
    DatabaseOptimizationService,
    OpenAIOptimizationService,
    QueueOptimizationService,
    PaginationService,
    CompressionInterceptor,
  ],
  exports: [
    CacheService,
    DatabaseOptimizationService,
    OpenAIOptimizationService,
    QueueOptimizationService,
    PaginationService,
    CompressionInterceptor,
  ],
})
export class PerformanceModule {}
