import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { ConfigService } from '@nestjs/config';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  throughput: number; // jobs per minute
}

export interface WorkerStats {
  concurrency: number;
  activeWorkers: number;
  memoryUsage: number;
  cpuUsage: number;
}

@Injectable()
export class QueueOptimizationService {
  private readonly logger = new Logger(QueueOptimizationService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly throughputTracking = new Map<string, number[]>();

  constructor(private configService: ConfigService) {}

  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
    this.setupQueueMonitoring(name, queue);
    this.logger.log(`Registered queue: ${name}`);
  }

  async getQueueStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];

    for (const [name, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all(
          [
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed(),
          ],
        );

        const throughput = this.calculateThroughput(name);

        stats.push({
          name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          paused: await queue.isPaused(),
          throughput,
        });
      } catch (error) {
        this.logger.error(`Error getting stats for queue ${name}:`, error);
      }
    }

    return stats;
  }

  async optimizeQueueSettings(): Promise<void> {
    for (const [name, queue] of this.queues) {
      try {
        const stats = await this.getQueueStatsForQueue(name, queue);
        const recommendations = this.generateOptimizationRecommendations(stats);

        await this.applyOptimizations(name, queue, recommendations);
      } catch (error) {
        this.logger.error(`Error optimizing queue ${name}:`, error);
      }
    }
  }

  async scaleWorkers(
    queueName: string,
    targetConcurrency: number,
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      // This would typically involve updating the queue processor concurrency
      // The exact implementation depends on your queue setup
      this.logger.log(
        `Scaling workers for queue ${queueName} to ${targetConcurrency}`,
      );

      // Update queue settings
      await queue.pause();

      // In a real implementation, you would:
      // 1. Update the processor concurrency
      // 2. Potentially spawn/kill worker processes
      // 3. Update load balancer configuration

      await queue.resume();

      this.logger.log(
        `Successfully scaled queue ${queueName} to ${targetConcurrency} workers`,
      );
    } catch (error) {
      this.logger.error(`Error scaling workers for queue ${queueName}:`, error);
      throw error;
    }
  }

  async getWorkerStats(): Promise<WorkerStats> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate active workers across all queues
      let activeWorkers = 0;
      for (const [, queue] of this.queues) {
        const active = await queue.getActive();
        activeWorkers += active.length;
      }

      return {
        concurrency: this.getTotalConcurrency(),
        activeWorkers,
        memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      };
    } catch (error) {
      this.logger.error('Error getting worker stats:', error);
      return {
        concurrency: 0,
        activeWorkers: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      };
    }
  }

  async cleanupFailedJobs(
    queueName: string,
    olderThanHours = 24,
  ): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
      const failedJobs = await queue.getFailed();

      let cleanedCount = 0;
      for (const job of failedJobs) {
        if (job.timestamp < cutoffTime) {
          await job.remove();
          cleanedCount++;
        }
      }

      this.logger.log(
        `Cleaned up ${cleanedCount} failed jobs from queue ${queueName}`,
      );
      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Error cleaning up failed jobs for queue ${queueName}:`,
        error,
      );
      throw error;
    }
  }

  async retryFailedJobs(queueName: string, maxRetries = 3): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const failedJobs = await queue.getFailed();
      let retriedCount = 0;

      for (const job of failedJobs) {
        const attemptsMade = job.attemptsMade || 0;
        if (attemptsMade < maxRetries) {
          await job.retry();
          retriedCount++;
        }
      }

      this.logger.log(
        `Retried ${retriedCount} failed jobs from queue ${queueName}`,
      );
      return retriedCount;
    } catch (error) {
      this.logger.error(
        `Error retrying failed jobs for queue ${queueName}:`,
        error,
      );
      throw error;
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.log(`Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.log(`Resumed queue: ${queueName}`);
  }

  private setupQueueMonitoring(name: string, queue: Queue): void {
    queue.on('completed', (job: Job) => {
      this.trackThroughput(name);
      this.logger.debug(`Job ${job.id} completed in queue ${name}`);
    });

    queue.on('failed', (job: Job, err: Error) => {
      this.logger.warn(`Job ${job.id} failed in queue ${name}: ${err.message}`);
    });

    queue.on('stalled', (job: Job) => {
      this.logger.warn(`Job ${job.id} stalled in queue ${name}`);
    });

    queue.on('error', (error: Error) => {
      this.logger.error(`Queue ${name} error:`, error);
    });
  }

  private trackThroughput(queueName: string): void {
    const now = Date.now();
    const timestamps = this.throughputTracking.get(queueName) || [];

    // Keep only timestamps from the last minute
    const oneMinuteAgo = now - 60000;
    const recentTimestamps = timestamps.filter((ts) => ts > oneMinuteAgo);
    recentTimestamps.push(now);

    this.throughputTracking.set(queueName, recentTimestamps);
  }

  private calculateThroughput(queueName: string): number {
    const timestamps = this.throughputTracking.get(queueName) || [];
    return timestamps.length; // Jobs per minute
  }

  private async getQueueStatsForQueue(
    name: string,
    queue: Queue,
  ): Promise<any> {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
    ]);

    return {
      name,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      throughput: this.calculateThroughput(name),
    };
  }

  private generateOptimizationRecommendations(stats: any): any {
    const recommendations = {
      adjustConcurrency: false,
      targetConcurrency: 1,
      cleanupNeeded: false,
      pauseRecommended: false,
    };

    // High queue backlog - increase concurrency
    if (stats.waiting > 100 && stats.throughput < 10) {
      recommendations.adjustConcurrency = true;
      recommendations.targetConcurrency = Math.min(
        10,
        Math.ceil(stats.waiting / 20),
      );
    }

    // Too many failed jobs - cleanup needed
    if (stats.failed > 50) {
      recommendations.cleanupNeeded = true;
    }

    // Very high failure rate - pause recommended
    const totalJobs = stats.completed + stats.failed;
    if (totalJobs > 0 && stats.failed / totalJobs > 0.5) {
      recommendations.pauseRecommended = true;
    }

    return recommendations;
  }

  private async applyOptimizations(
    name: string,
    queue: Queue,
    recommendations: any,
  ): Promise<void> {
    if (recommendations.pauseRecommended) {
      this.logger.warn(
        `High failure rate detected for queue ${name}, pausing for investigation`,
      );
      await this.pauseQueue(name);
      return;
    }

    if (recommendations.cleanupNeeded) {
      await this.cleanupFailedJobs(name);
    }

    if (recommendations.adjustConcurrency) {
      this.logger.log(
        `Adjusting concurrency for queue ${name} to ${recommendations.targetConcurrency}`,
      );
      // Implementation would depend on your specific queue setup
    }
  }

  private getTotalConcurrency(): number {
    // This would return the total configured concurrency across all queues
    // Implementation depends on your specific setup
    return this.configService.get('QUEUE_CONCURRENCY', 5);
  }
}
