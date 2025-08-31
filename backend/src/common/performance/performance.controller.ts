import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CacheService } from './cache.service';
import { DatabaseOptimizationService } from './database-optimization.service';
import { OpenAIOptimizationService } from './openai-optimization.service';
import { QueueOptimizationService } from './queue-optimization.service';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly dbOptimization: DatabaseOptimizationService,
    private readonly openaiOptimization: OpenAIOptimizationService,
    private readonly queueOptimization: QueueOptimizationService,
  ) {}

  @Get('cache/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get cache performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
  })
  async getCacheStats() {
    const stats = await this.cacheService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('database/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get database performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Database statistics retrieved successfully',
  })
  async getDatabaseStats() {
    const [connectionStats, slowQueries, indexRecommendations] =
      await Promise.all([
        this.dbOptimization.getConnectionPoolStats(),
        this.dbOptimization.getSlowQueries(5),
        this.dbOptimization.getIndexRecommendations(),
      ]);

    return {
      success: true,
      data: {
        connectionPool: connectionStats,
        slowQueries,
        indexRecommendations,
      },
    };
  }

  @Post('database/optimize')
  @Roles('admin')
  @ApiOperation({ summary: 'Run database optimization tasks' })
  @ApiResponse({
    status: 200,
    description: 'Database optimization completed successfully',
  })
  async optimizeDatabase() {
    await Promise.all([
      this.dbOptimization.createOptimalIndexes(),
      this.dbOptimization.optimizeTableStatistics(),
    ]);

    return {
      success: true,
      message: 'Database optimization completed successfully',
    };
  }

  @Get('database/analyze-query')
  @Roles('admin')
  @ApiOperation({ summary: 'Analyze a specific database query' })
  @ApiResponse({
    status: 200,
    description: 'Query analysis completed successfully',
  })
  async analyzeQuery(@Query('query') query: string) {
    if (!query) {
      return {
        success: false,
        message: 'Query parameter is required',
      };
    }

    const analysis = await this.dbOptimization.analyzeQuery(query);
    return {
      success: true,
      data: analysis,
    };
  }

  @Get('openai/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get OpenAI usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'OpenAI statistics retrieved successfully',
  })
  async getOpenAIStats() {
    const stats = await this.openaiOptimization.getUsageStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Post('openai/reset-stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Reset OpenAI usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'OpenAI statistics reset successfully',
  })
  async resetOpenAIStats() {
    await this.openaiOptimization.resetUsageStats();
    return {
      success: true,
      message: 'OpenAI usage statistics reset successfully',
    };
  }

  @Get('queues/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get queue performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  async getQueueStats() {
    const [queueStats, workerStats] = await Promise.all([
      this.queueOptimization.getQueueStats(),
      this.queueOptimization.getWorkerStats(),
    ]);

    return {
      success: true,
      data: {
        queues: queueStats,
        workers: workerStats,
      },
    };
  }

  @Post('queues/optimize')
  @Roles('admin')
  @ApiOperation({ summary: 'Run queue optimization tasks' })
  @ApiResponse({
    status: 200,
    description: 'Queue optimization completed successfully',
  })
  async optimizeQueues() {
    await this.queueOptimization.optimizeQueueSettings();
    return {
      success: true,
      message: 'Queue optimization completed successfully',
    };
  }

  @Post('queues/:queueName/cleanup')
  @Roles('admin')
  @ApiOperation({ summary: 'Cleanup failed jobs in a specific queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue cleanup completed successfully',
  })
  async cleanupQueue(
    @Query('queueName') queueName: string,
    @Query('olderThanHours') olderThanHours?: number,
  ) {
    const cleanedCount = await this.queueOptimization.cleanupFailedJobs(
      queueName,
      olderThanHours ? parseInt(olderThanHours.toString()) : 24,
    );

    return {
      success: true,
      message: `Cleaned up ${cleanedCount} failed jobs from queue ${queueName}`,
      data: { cleanedCount },
    };
  }

  @Post('queues/:queueName/retry')
  @Roles('admin')
  @ApiOperation({ summary: 'Retry failed jobs in a specific queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue retry completed successfully',
  })
  async retryFailedJobs(
    @Query('queueName') queueName: string,
    @Query('maxRetries') maxRetries?: number,
  ) {
    const retriedCount = await this.queueOptimization.retryFailedJobs(
      queueName,
      maxRetries ? parseInt(maxRetries.toString()) : 3,
    );

    return {
      success: true,
      message: `Retried ${retriedCount} failed jobs from queue ${queueName}`,
      data: { retriedCount },
    };
  }

  @Get('overview')
  @Roles('admin')
  @ApiOperation({ summary: 'Get overall performance overview' })
  @ApiResponse({
    status: 200,
    description: 'Performance overview retrieved successfully',
  })
  async getPerformanceOverview() {
    const [cacheStats, dbStats, openaiStats, queueStats, workerStats] =
      await Promise.all([
        this.cacheService.getStats(),
        this.dbOptimization.getConnectionPoolStats(),
        this.openaiOptimization.getUsageStats(),
        this.queueOptimization.getQueueStats(),
        this.queueOptimization.getWorkerStats(),
      ]);

    // Calculate overall health score
    const healthScore = this.calculateHealthScore({
      cache: cacheStats,
      database: dbStats,
      openai: openaiStats,
      queues: queueStats,
      workers: workerStats,
    });

    return {
      success: true,
      data: {
        healthScore,
        cache: cacheStats,
        database: dbStats,
        openai: openaiStats,
        queues: queueStats,
        workers: workerStats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private calculateHealthScore(metrics: any): number {
    let score = 100;

    // Cache health (20% weight)
    if (metrics.cache.hitRate < 50) score -= 10;
    else if (metrics.cache.hitRate < 70) score -= 5;

    // Database health (30% weight)
    if (
      metrics.database?.currentConnections >
      metrics.database?.maxConnections * 0.8
    ) {
      score -= 15;
    } else if (
      metrics.database?.currentConnections >
      metrics.database?.maxConnections * 0.6
    ) {
      score -= 8;
    }

    // Queue health (25% weight)
    const totalWaiting = metrics.queues.reduce(
      (sum: number, q: any) => sum + q.waiting,
      0,
    );
    const totalFailed = metrics.queues.reduce(
      (sum: number, q: any) => sum + q.failed,
      0,
    );

    if (totalWaiting > 1000) score -= 12;
    else if (totalWaiting > 500) score -= 6;

    if (totalFailed > 100) score -= 8;
    else if (totalFailed > 50) score -= 4;

    // Worker health (15% weight)
    if (metrics.workers.memoryUsage > 1000)
      score -= 8; // > 1GB
    else if (metrics.workers.memoryUsage > 500) score -= 4; // > 500MB

    // OpenAI cost efficiency (10% weight)
    if (metrics.openai.cacheHitRate < 30) score -= 5;
    else if (metrics.openai.cacheHitRate < 50) score -= 2;

    return Math.max(0, Math.min(100, score));
  }
}
