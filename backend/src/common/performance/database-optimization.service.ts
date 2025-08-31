import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  suggestions: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
}

@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
      const startTime = Date.now();

      // Execute EXPLAIN ANALYZE
      const explainResult = await this.dataSource.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
      );

      const executionTime = Date.now() - startTime;
      const plan = explainResult[0]['QUERY PLAN'][0];

      // Extract information from the execution plan
      const analysis: QueryAnalysis = {
        query,
        executionTime,
        rowsReturned: plan['Actual Rows'] || 0,
        indexesUsed: this.extractIndexesUsed(plan),
        suggestions: this.generateSuggestions(plan),
      };

      this.logger.log(`Query analysis completed in ${executionTime}ms`);
      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing query:', error);
      throw error;
    }
  }

  async getSlowQueries(limit = 10): Promise<any[]> {
    try {
      // Enable pg_stat_statements if not already enabled
      await this.ensurePgStatStatements();

      const slowQueries = await this.dataSource.query(
        `
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC 
        LIMIT $1
      `,
        [limit],
      );

      return slowQueries;
    } catch (error) {
      this.logger.warn(
        'Could not retrieve slow queries (pg_stat_statements may not be enabled):',
        error.message,
      );
      return [];
    }
  }

  async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    try {
      // Check for missing indexes on foreign keys
      const missingFkIndexes = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        AND attname LIKE '%_id'
        AND n_distinct > 100
      `);

      for (const row of missingFkIndexes) {
        // Check if index already exists
        const existingIndex = await this.dataSource.query(
          `
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = $1 
          AND indexdef LIKE '%' || $2 || '%'
        `,
          [row.tablename, row.attname],
        );

        if (existingIndex.length === 0) {
          recommendations.push({
            table: row.tablename,
            columns: [row.attname],
            type: 'btree',
            reason: 'Foreign key without index detected',
            estimatedImprovement: 'High - will improve JOIN performance',
          });
        }
      }

      // Check for tables with high sequential scan ratio
      const highSeqScanTables = await this.dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          CASE 
            WHEN seq_scan + idx_scan > 0 
            THEN 100.0 * seq_scan / (seq_scan + idx_scan) 
            ELSE 0 
          END AS seq_scan_ratio
        FROM pg_stat_user_tables 
        WHERE seq_scan > idx_scan 
        AND seq_scan > 1000
        ORDER BY seq_scan_ratio DESC
      `);

      for (const table of highSeqScanTables) {
        recommendations.push({
          table: table.tablename,
          columns: ['*'],
          type: 'btree',
          reason: `High sequential scan ratio (${Math.round(table.seq_scan_ratio)}%)`,
          estimatedImprovement:
            'Medium - analyze query patterns for specific columns',
        });
      }

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting index recommendations:', error);
      return recommendations;
    }
  }

  async createOptimalIndexes(): Promise<void> {
    try {
      const indexes = [
        // Candidates table optimizations
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_email_lower ON candidates (LOWER(email))',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_created_at ON candidates (created_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_skills_gin ON candidates USING gin (skill_embeddings)',

        // Applications table optimizations
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_candidate_job ON applications (candidate_id, company_job_variant_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_status_updated ON applications (status, last_updated)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_fit_score ON applications (fit_score DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_applied_at ON applications (applied_at)',

        // Job-related table optimizations
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_job_variants_active ON company_job_variants (is_active, published_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_templates_level ON job_templates (level)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirement_items_category_weight ON requirement_items (category, weight)',

        // Analytics table optimizations
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_metrics_company_date ON pipeline_metrics (company_id, date_range)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_source_performance_company_source ON source_performance (company_id, source)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diversity_metrics_company_date ON diversity_metrics (company_id, date_range)',

        // Communication table optimizations
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_logs_candidate_sent ON email_logs (candidate_id, sent_at)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_history_candidate ON communication_history (candidate_id, created_at)',

        // Composite indexes for common query patterns
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_company_status_score ON applications (company_job_variant_id, status, fit_score DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_location_created ON candidates (location, created_at) WHERE location IS NOT NULL',
      ];

      for (const indexQuery of indexes) {
        try {
          await this.dataSource.query(indexQuery);
          this.logger.log(`Created index: ${indexQuery.split(' ')[5]}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            this.logger.warn(`Failed to create index: ${error.message}`);
          }
        }
      }

      this.logger.log('Optimal indexes creation completed');
    } catch (error) {
      this.logger.error('Error creating optimal indexes:', error);
      throw error;
    }
  }

  async optimizeTableStatistics(): Promise<void> {
    try {
      const tables = [
        'candidates',
        'applications',
        'company_job_variants',
        'job_templates',
        'requirement_items',
        'pipeline_metrics',
        'source_performance',
        'diversity_metrics',
      ];

      for (const table of tables) {
        await this.dataSource.query(`ANALYZE ${table}`);
        this.logger.log(`Updated statistics for table: ${table}`);
      }

      this.logger.log('Table statistics optimization completed');
    } catch (error) {
      this.logger.error('Error optimizing table statistics:', error);
      throw error;
    }
  }

  async getConnectionPoolStats(): Promise<any> {
    try {
      const stats = await this.dataSource.query(`
        SELECT 
          state,
          COUNT(*) as count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
      `);

      const totalConnections = await this.dataSource.query(`
        SELECT setting::int as max_connections 
        FROM pg_settings 
        WHERE name = 'max_connections'
      `);

      return {
        connectionsByState: stats,
        maxConnections: totalConnections[0]?.max_connections || 0,
        currentConnections: stats.reduce(
          (sum, row) => sum + parseInt(row.count),
          0,
        ),
      };
    } catch (error) {
      this.logger.error('Error getting connection pool stats:', error);
      return null;
    }
  }

  private extractIndexesUsed(plan: any): string[] {
    const indexes: string[] = [];

    const extractFromNode = (node: any) => {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }

      if (node.Plans) {
        for (const childPlan of node.Plans) {
          extractFromNode(childPlan);
        }
      }
    };

    extractFromNode(plan);
    return [...new Set(indexes)]; // Remove duplicates
  }

  private generateSuggestions(plan: any): string[] {
    const suggestions: string[] = [];

    const analyzeNode = (node: any) => {
      // Check for sequential scans on large tables
      if (node['Node Type'] === 'Seq Scan' && node['Actual Rows'] > 1000) {
        suggestions.push(
          `Consider adding an index on table ${node['Relation Name']} for better performance`,
        );
      }

      // Check for nested loops with high cost
      if (node['Node Type'] === 'Nested Loop' && node['Total Cost'] > 1000) {
        suggestions.push(
          'Nested loop detected with high cost - consider optimizing JOIN conditions',
        );
      }

      // Check for sorts that spill to disk
      if (
        node['Node Type'] === 'Sort' &&
        node['Sort Method'] &&
        node['Sort Method'].includes('external')
      ) {
        suggestions.push(
          'Sort operation spilling to disk - consider increasing work_mem or adding an index',
        );
      }

      if (node.Plans) {
        for (const childPlan of node.Plans) {
          analyzeNode(childPlan);
        }
      }
    };

    analyzeNode(plan);
    return suggestions;
  }

  private async ensurePgStatStatements(): Promise<void> {
    try {
      await this.dataSource.query(
        'CREATE EXTENSION IF NOT EXISTS pg_stat_statements',
      );
    } catch (error) {
      // Extension might not be available or already exists
      this.logger.debug(
        'pg_stat_statements extension handling:',
        error.message,
      );
    }
  }
}
