import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokenCount: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly embeddingModel = 'text-embedding-3-large';
  private readonly maxTokens = 8191; // Max tokens for text-embedding-3-large

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Generate embeddings for candidate skills and experience
   */
  async generateCandidateEmbedding(
    skills: string[],
    experience: string,
    summary?: string,
  ): Promise<EmbeddingResult> {
    try {
      this.logger.log('Generating candidate embedding');

      // Combine skills, experience, and summary into a comprehensive text
      const candidateText = this.buildCandidateText(
        skills,
        experience,
        summary,
      );

      return await this.generateEmbedding(candidateText);
    } catch (error) {
      this.logger.error(
        `Error generating candidate embedding: ${error.message}`,
      );
      throw new Error(
        `Failed to generate candidate embedding: ${error.message}`,
      );
    }
  }

  /**
   * Generate embeddings for job requirements
   */
  async generateJobRequirementsEmbedding(
    requirements: Array<{
      description: string;
      type: string;
      category: string;
      weight: number;
    }>,
    jobTitle?: string,
    jobDescription?: string,
  ): Promise<EmbeddingResult> {
    try {
      this.logger.log('Generating job requirements embedding');

      // Build comprehensive job requirements text
      const requirementsText = this.buildJobRequirementsText(
        requirements,
        jobTitle,
        jobDescription,
      );

      return await this.generateEmbedding(requirementsText);
    } catch (error) {
      this.logger.error(
        `Error generating job requirements embedding: ${error.message}`,
      );
      throw new Error(
        `Failed to generate job requirements embedding: ${error.message}`,
      );
    }
  }

  /**
   * Generate embeddings for individual skill or requirement
   */
  async generateSkillEmbedding(skill: string): Promise<EmbeddingResult> {
    try {
      this.logger.log(`Generating embedding for skill: ${skill}`);
      return await this.generateEmbedding(skill);
    } catch (error) {
      this.logger.error(`Error generating skill embedding: ${error.message}`);
      throw new Error(`Failed to generate skill embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple skills in batch
   */
  async generateBatchSkillEmbeddings(
    skills: string[],
  ): Promise<EmbeddingResult[]> {
    try {
      this.logger.log(`Generating embeddings for ${skills.length} skills`);

      const results: EmbeddingResult[] = [];

      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < skills.length; i += batchSize) {
        const batch = skills.slice(i, i + batchSize);
        const batchPromises = batch.map((skill) =>
          this.generateEmbedding(skill),
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add small delay between batches to respect rate limits
        if (i + batchSize < skills.length) {
          await this.sleep(100);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Error generating batch skill embeddings: ${error.message}`,
      );
      throw new Error(
        `Failed to generate batch skill embeddings: ${error.message}`,
      );
    }
  }

  /**
   * Core embedding generation method
   */
  private async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Truncate text if it exceeds token limit
    const truncatedText = this.truncateText(text);

    const response = await this.callOpenAIWithRetry(async () => {
      return await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: truncatedText,
        encoding_format: 'float',
      });
    });

    const embedding = response.data[0].embedding;
    const tokenCount = response.usage.total_tokens;

    this.logger.log(
      `Generated embedding with ${embedding.length} dimensions, ${tokenCount} tokens`,
    );

    return {
      embedding,
      text: truncatedText,
      tokenCount,
    };
  }

  /**
   * Build comprehensive candidate text for embedding
   */
  private buildCandidateText(
    skills: string[],
    experience: string,
    summary?: string,
  ): string {
    const parts: string[] = [];

    if (summary) {
      parts.push(`Summary: ${summary}`);
    }

    if (skills.length > 0) {
      parts.push(`Skills: ${skills.join(', ')}`);
    }

    if (experience) {
      parts.push(`Experience: ${experience}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build comprehensive job requirements text for embedding
   */
  private buildJobRequirementsText(
    requirements: Array<{
      description: string;
      type: string;
      category: string;
      weight: number;
    }>,
    jobTitle?: string,
    jobDescription?: string,
  ): string {
    const parts: string[] = [];

    if (jobTitle) {
      parts.push(`Job Title: ${jobTitle}`);
    }

    if (jobDescription) {
      parts.push(`Job Description: ${jobDescription}`);
    }

    // Group requirements by category
    const mustHave = requirements.filter((r) => r.category === 'must');
    const shouldHave = requirements.filter((r) => r.category === 'should');
    const niceToHave = requirements.filter((r) => r.category === 'nice');

    if (mustHave.length > 0) {
      parts.push(
        `Must Have Requirements: ${mustHave.map((r) => r.description).join(', ')}`,
      );
    }

    if (shouldHave.length > 0) {
      parts.push(
        `Should Have Requirements: ${shouldHave.map((r) => r.description).join(', ')}`,
      );
    }

    if (niceToHave.length > 0) {
      parts.push(
        `Nice to Have Requirements: ${niceToHave.map((r) => r.description).join(', ')}`,
      );
    }

    return parts.join('\n\n');
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string): string {
    // Rough estimation: 1 token ≈ 4 characters for English text
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens <= this.maxTokens) {
      return text;
    }

    // Truncate to approximately fit within token limit
    const maxChars = this.maxTokens * 4;
    const truncated = text.substring(0, maxChars);

    this.logger.warn(
      `Text truncated from ${text.length} to ${truncated.length} characters`,
    );

    return truncated;
  }

  /**
   * Retry wrapper for OpenAI API calls
   */
  private async callOpenAIWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `OpenAI API call failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          // Check if it's a rate limit error
          if (error.status === 429) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            this.logger.log(`Rate limited, waiting ${delay}ms before retry`);
            await this.sleep(delay);
          } else {
            await this.sleep(this.retryDelay);
          }
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
