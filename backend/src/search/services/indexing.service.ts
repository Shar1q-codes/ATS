import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '../../entities/candidate.entity';
import { JobFamily } from '../../entities/job-family.entity';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';

@Injectable()
export class IndexingService implements OnModuleInit {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(JobFamily)
    private readonly jobFamilyRepository: Repository<JobFamily>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ApplicationNote)
    private readonly applicationNoteRepository: Repository<ApplicationNote>,
  ) {}

  async onModuleInit() {
    await this.createIndices();
  }

  async createIndices(): Promise<void> {
    const indices = [
      {
        name: 'candidates',
        mapping: this.getCandidateMapping(),
      },
      {
        name: 'jobs',
        mapping: this.getJobMapping(),
      },
      {
        name: 'applications',
        mapping: this.getApplicationMapping(),
      },
      {
        name: 'notes',
        mapping: this.getNoteMapping(),
      },
      {
        name: 'search_analytics',
        mapping: this.getSearchAnalyticsMapping(),
      },
    ];

    for (const index of indices) {
      try {
        const exists = await this.elasticsearchService.indices.exists({
          index: index.name,
        });

        if (!exists.body) {
          await this.elasticsearchService.indices.create({
            index: index.name,
            body: {
              mappings: index.mapping,
              settings: {
                number_of_shards: 1,
                number_of_replicas: 0,
                analysis: {
                  analyzer: {
                    skill_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'stop', 'snowball'],
                    },
                  },
                },
              },
            },
          });

          this.logger.log(`Created index: ${index.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create index ${index.name}`, error);
      }
    }
  }

  async indexCandidate(candidate: Candidate): Promise<void> {
    try {
      const document = {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        title: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        skills: candidate.parsedData?.skills?.map((skill) => skill.name) || [],
        content: this.buildCandidateContent(candidate),
        total_experience: candidate.parsedData?.totalExperience || 0,
        education:
          candidate.parsedData?.education?.map((edu) => edu.degree) || [],
        certifications:
          candidate.parsedData?.certifications?.map((cert) => cert.name) || [],
        tenant_id: candidate.tenantId,
        created_at: candidate.createdAt,
        updated_at: candidate.updatedAt,
      };

      await this.elasticsearchService.index({
        index: 'candidates',
        id: candidate.id,
        body: document,
      });

      this.logger.debug(`Indexed candidate: ${candidate.id}`);
    } catch (error) {
      this.logger.error(`Failed to index candidate ${candidate.id}`, error);
    }
  }

  async indexJob(job: any): Promise<void> {
    try {
      const document = {
        id: job.id,
        title: job.title || job.name,
        description: job.description,
        content: this.buildJobContent(job),
        skills:
          job.requirements
            ?.filter((req) => req.type === 'skill')
            .map((req) => req.description) || [],
        location: job.location,
        experience_required: job.experienceRange?.min || 0,
        salary_min: job.salaryRange?.min,
        salary_max: job.salaryRange?.max,
        job_type: job.workArrangement,
        tenant_id: job.tenantId,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      };

      await this.elasticsearchService.index({
        index: 'jobs',
        id: job.id,
        body: document,
      });

      this.logger.debug(`Indexed job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to index job ${job.id}`, error);
    }
  }

  async indexApplication(application: Application): Promise<void> {
    try {
      const document = {
        id: application.id,
        title: `Application - ${application.candidate?.firstName} ${application.candidate?.lastName}`,
        content: this.buildApplicationContent(application),
        candidate_name: `${application.candidate?.firstName} ${application.candidate?.lastName}`,
        candidate_email: application.candidate?.email,
        job_title: application.companyJobVariant?.customTitle,
        status: application.status,
        fit_score: application.fitScore,
        tenant_id: application.tenantId,
        created_at: application.appliedAt,
        updated_at: application.lastUpdated,
      };

      await this.elasticsearchService.index({
        index: 'applications',
        id: application.id,
        body: document,
      });

      this.logger.debug(`Indexed application: ${application.id}`);
    } catch (error) {
      this.logger.error(`Failed to index application ${application.id}`, error);
    }
  }

  async indexNote(note: ApplicationNote): Promise<void> {
    try {
      const document = {
        id: note.id,
        title: `Note - ${note.application?.candidate?.firstName} ${note.application?.candidate?.lastName}`,
        content: note.content,
        application_id: note.applicationId,
        author_name: note.author?.firstName + ' ' + note.author?.lastName,
        tenant_id: note.tenantId,
        created_at: note.createdAt,
        updated_at: note.updatedAt,
      };

      await this.elasticsearchService.index({
        index: 'notes',
        id: note.id,
        body: document,
      });

      this.logger.debug(`Indexed note: ${note.id}`);
    } catch (error) {
      this.logger.error(`Failed to index note ${note.id}`, error);
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index,
        id,
      });

      this.logger.debug(`Deleted document ${id} from ${index}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id} from ${index}`, error);
    }
  }

  async bulkIndex(operations: any[]): Promise<void> {
    try {
      const response = await this.elasticsearchService.bulk({
        body: operations,
      });

      if (response.body.errors) {
        this.logger.error('Bulk indexing had errors', response.body.items);
      } else {
        this.logger.log(`Bulk indexed ${operations.length / 2} documents`);
      }
    } catch (error) {
      this.logger.error('Bulk indexing failed', error);
    }
  }

  async reindexAll(tenantId?: string): Promise<void> {
    this.logger.log('Starting full reindex...');

    try {
      // Reindex candidates
      const candidateQuery = tenantId ? { where: { tenantId } } : {};

      const candidates = await this.candidateRepository.find({
        ...candidateQuery,
        relations: ['parsedData'],
      });

      for (const candidate of candidates) {
        await this.indexCandidate(candidate);
      }

      // Reindex applications
      const applicationQuery = tenantId ? { where: { tenantId } } : {};

      const applications = await this.applicationRepository.find({
        ...applicationQuery,
        relations: ['candidate', 'companyJobVariant'],
      });

      for (const application of applications) {
        await this.indexApplication(application);
      }

      // Reindex notes
      const noteQuery = tenantId ? { where: { tenantId } } : {};

      const notes = await this.applicationNoteRepository.find({
        ...noteQuery,
        relations: ['application', 'application.candidate', 'author'],
      });

      for (const note of notes) {
        await this.indexNote(note);
      }

      this.logger.log('Full reindex completed');
    } catch (error) {
      this.logger.error('Full reindex failed', error);
    }
  }

  private getCandidateMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        email: { type: 'keyword' },
        phone: { type: 'keyword' },
        location: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        skills: {
          type: 'text',
          analyzer: 'skill_analyzer',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        content: {
          type: 'text',
          analyzer: 'standard',
        },
        total_experience: { type: 'integer' },
        education: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        certifications: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        tenant_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
      },
    };
  }

  private getJobMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        description: { type: 'text' },
        content: { type: 'text' },
        skills: {
          type: 'text',
          analyzer: 'skill_analyzer',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        location: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        experience_required: { type: 'integer' },
        salary_min: { type: 'integer' },
        salary_max: { type: 'integer' },
        job_type: { type: 'keyword' },
        tenant_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
      },
    };
  }

  private getApplicationMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        content: { type: 'text' },
        candidate_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        candidate_email: { type: 'keyword' },
        job_title: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        status: { type: 'keyword' },
        fit_score: { type: 'float' },
        tenant_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
      },
    };
  }

  private getNoteMapping() {
    return {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        content: { type: 'text' },
        application_id: { type: 'keyword' },
        author_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        tenant_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
      },
    };
  }

  private getSearchAnalyticsMapping() {
    return {
      properties: {
        query: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        search_type: { type: 'keyword' },
        result_count: { type: 'integer' },
        tenant_id: { type: 'keyword' },
        user_id: { type: 'keyword' },
        timestamp: { type: 'date' },
      },
    };
  }

  private buildCandidateContent(candidate: Candidate): string {
    const parts = [
      `${candidate.firstName} ${candidate.lastName}`,
      candidate.email,
      candidate.location,
      candidate.parsedData?.summary,
      candidate.parsedData?.skills?.map((skill) => skill.name).join(' '),
      candidate.parsedData?.experience
        ?.map((exp) => `${exp.title} at ${exp.company}`)
        .join(' '),
      candidate.parsedData?.education
        ?.map((edu) => `${edu.degree} from ${edu.institution}`)
        .join(' '),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildJobContent(job: any): string {
    const parts = [
      job.title || job.name,
      job.description,
      job.location,
      job.requirements?.map((req) => req.description).join(' '),
    ].filter(Boolean);

    return parts.join(' ');
  }

  private buildApplicationContent(application: Application): string {
    const parts = [
      `${application.candidate?.firstName} ${application.candidate?.lastName}`,
      application.candidate?.email,
      application.companyJobVariant?.customTitle,
      application.status,
      application.matchExplanation?.strengths?.join(' '),
      application.notes?.map((note) => note.content).join(' '),
    ].filter(Boolean);

    return parts.join(' ');
  }
}
