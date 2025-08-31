import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../../entities/candidate.entity';
import { RequirementItem } from '../../entities/requirement-item.entity';
import { CompanyJobVariant } from '../../entities/company-job-variant.entity';

export interface VectorSearchResult {
  id: string;
  similarity: number;
  entity: Candidate | RequirementItem | CompanyJobVariant;
}

export interface SimilaritySearchOptions {
  limit?: number;
  threshold?: number;
  includeEntity?: boolean;
}

@Injectable()
export class VectorStorageService {
  private readonly logger = new Logger(VectorStorageService.name);

  constructor(
    @InjectRepository(Candidate)
    private candidateRepository: Repository<Candidate>,
    @InjectRepository(RequirementItem)
    private requirementRepository: Repository<RequirementItem>,
    @InjectRepository(CompanyJobVariant)
    private jobVariantRepository: Repository<CompanyJobVariant>,
  ) {}

  /**
   * Store candidate skill embeddings
   */
  async storeCandidateEmbedding(
    candidateId: string,
    embedding: number[],
  ): Promise<void> {
    try {
      this.logger.log(`Storing embedding for candidate ${candidateId}`);

      await this.candidateRepository.update(candidateId, {
        skillEmbeddings: embedding,
      });

      this.logger.log(
        `Successfully stored embedding for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.error(`Error storing candidate embedding: ${error.message}`);
      throw new Error(`Failed to store candidate embedding: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find similar candidates based on skill embeddings
   */
  async findSimilarCandidates(
    targetEmbedding: number[],
    options: SimilaritySearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    try {
      const { limit = 10, threshold = 0.7, includeEntity = true } = options;

      this.logger.log(`Finding similar candidates with threshold ${threshold}`);

      // Get all candidates with embeddings
      const candidates = await this.candidateRepository.find({
        where: {
          skillEmbeddings: 'NOT NULL' as any, // TypeORM doesn't have great support for this
        },
        ...(includeEntity && {
          relations: ['parsedData', 'applications'],
        }),
      });

      // Calculate similarities
      const results: VectorSearchResult[] = [];

      for (const candidate of candidates) {
        if (
          !candidate.skillEmbeddings ||
          candidate.skillEmbeddings.length === 0
        ) {
          continue;
        }

        const similarity = this.calculateCosineSimilarity(
          targetEmbedding,
          candidate.skillEmbeddings,
        );

        if (similarity >= threshold) {
          results.push({
            id: candidate.id,
            similarity,
            entity: candidate,
          });
        }
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, limit);

      this.logger.log(`Found ${limitedResults.length} similar candidates`);

      return limitedResults;
    } catch (error) {
      this.logger.error(`Error finding similar candidates: ${error.message}`);
      throw new Error(`Failed to find similar candidates: ${error.message}`);
    }
  }

  /**
   * Find candidates matching job requirements using vector similarity
   */
  async findCandidatesForJob(
    jobEmbedding: number[],
    jobVariantId: string,
    options: SimilaritySearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    try {
      const { limit = 50, threshold = 0.6, includeEntity = true } = options;

      this.logger.log(`Finding candidates for job variant ${jobVariantId}`);

      // Get candidates who haven't already applied to this job
      const candidates = await this.candidateRepository
        .createQueryBuilder('candidate')
        .leftJoin('candidate.applications', 'application')
        .where('candidate.skillEmbeddings IS NOT NULL')
        .andWhere(
          '(application.companyJobVariantId != :jobVariantId OR application.companyJobVariantId IS NULL)',
          { jobVariantId },
        )
        .getMany();

      // Calculate similarities
      const results: VectorSearchResult[] = [];

      for (const candidate of candidates) {
        if (
          !candidate.skillEmbeddings ||
          candidate.skillEmbeddings.length === 0
        ) {
          continue;
        }

        const similarity = this.calculateCosineSimilarity(
          jobEmbedding,
          candidate.skillEmbeddings,
        );

        if (similarity >= threshold) {
          results.push({
            id: candidate.id,
            similarity,
            entity: includeEntity ? candidate : null,
          });
        }
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      const limitedResults = results.slice(0, limit);

      this.logger.log(
        `Found ${limitedResults.length} matching candidates for job`,
      );

      return limitedResults;
    } catch (error) {
      this.logger.error(`Error finding candidates for job: ${error.message}`);
      throw new Error(`Failed to find candidates for job: ${error.message}`);
    }
  }

  /**
   * Get candidate by ID with embeddings
   */
  async getCandidateWithEmbeddings(
    candidateId: string,
  ): Promise<Candidate | null> {
    try {
      return await this.candidateRepository.findOne({
        where: { id: candidateId },
        relations: ['parsedData'],
      });
    } catch (error) {
      this.logger.error(
        `Error getting candidate with embeddings: ${error.message}`,
      );
      throw new Error(
        `Failed to get candidate with embeddings: ${error.message}`,
      );
    }
  }

  /**
   * Check if candidate has embeddings stored
   */
  async hasCandidateEmbeddings(candidateId: string): Promise<boolean> {
    try {
      const candidate = await this.candidateRepository.findOne({
        where: { id: candidateId },
        select: ['id', 'skillEmbeddings'],
      });

      return !!(
        candidate?.skillEmbeddings && candidate.skillEmbeddings.length > 0
      );
    } catch (error) {
      this.logger.error(
        `Error checking candidate embeddings: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Batch update candidate embeddings
   */
  async batchUpdateCandidateEmbeddings(
    updates: Array<{ candidateId: string; embedding: number[] }>,
  ): Promise<void> {
    try {
      this.logger.log(`Batch updating ${updates.length} candidate embeddings`);

      // Process in smaller batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        const updatePromises = batch.map(({ candidateId, embedding }) =>
          this.candidateRepository.update(candidateId, {
            skillEmbeddings: embedding,
          }),
        );

        await Promise.all(updatePromises);

        this.logger.log(
          `Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`,
        );
      }

      this.logger.log(
        `Successfully updated ${updates.length} candidate embeddings`,
      );
    } catch (error) {
      this.logger.error(
        `Error batch updating candidate embeddings: ${error.message}`,
      );
      throw new Error(
        `Failed to batch update candidate embeddings: ${error.message}`,
      );
    }
  }

  /**
   * Get statistics about stored embeddings
   */
  async getEmbeddingStats(): Promise<{
    totalCandidates: number;
    candidatesWithEmbeddings: number;
    embeddingCoverage: number;
  }> {
    try {
      const totalCandidates = await this.candidateRepository.count();

      const candidatesWithEmbeddings = await this.candidateRepository.count({
        where: {
          skillEmbeddings: 'NOT NULL' as any,
        },
      });

      const embeddingCoverage =
        totalCandidates > 0
          ? (candidatesWithEmbeddings / totalCandidates) * 100
          : 0;

      return {
        totalCandidates,
        candidatesWithEmbeddings,
        embeddingCoverage: Math.round(embeddingCoverage * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Error getting embedding stats: ${error.message}`);
      throw new Error(`Failed to get embedding stats: ${error.message}`);
    }
  }
}
