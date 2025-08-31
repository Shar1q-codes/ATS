import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IndexingService } from './indexing.service';
import { Candidate } from '../../entities/candidate.entity';
import { Application } from '../../entities/application.entity';
import { ApplicationNote } from '../../entities/application-note.entity';

@Injectable()
export class SearchIndexingListenerService {
  private readonly logger = new Logger(SearchIndexingListenerService.name);

  constructor(private readonly indexingService: IndexingService) {}

  @OnEvent('candidate.created')
  async handleCandidateCreated(candidate: Candidate) {
    try {
      await this.indexingService.indexCandidate(candidate);
      this.logger.debug(`Indexed new candidate: ${candidate.id}`);
    } catch (error) {
      this.logger.error(`Failed to index candidate ${candidate.id}`, error);
    }
  }

  @OnEvent('candidate.updated')
  async handleCandidateUpdated(candidate: Candidate) {
    try {
      await this.indexingService.indexCandidate(candidate);
      this.logger.debug(`Re-indexed updated candidate: ${candidate.id}`);
    } catch (error) {
      this.logger.error(`Failed to re-index candidate ${candidate.id}`, error);
    }
  }

  @OnEvent('candidate.deleted')
  async handleCandidateDeleted(candidateId: string) {
    try {
      await this.indexingService.deleteDocument('candidates', candidateId);
      this.logger.debug(`Removed candidate from index: ${candidateId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove candidate ${candidateId} from index`,
        error,
      );
    }
  }

  @OnEvent('job.created')
  async handleJobCreated(job: any) {
    try {
      await this.indexingService.indexJob(job);
      this.logger.debug(`Indexed new job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to index job ${job.id}`, error);
    }
  }

  @OnEvent('job.updated')
  async handleJobUpdated(job: any) {
    try {
      await this.indexingService.indexJob(job);
      this.logger.debug(`Re-indexed updated job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to re-index job ${job.id}`, error);
    }
  }

  @OnEvent('job.deleted')
  async handleJobDeleted(jobId: string) {
    try {
      await this.indexingService.deleteDocument('jobs', jobId);
      this.logger.debug(`Removed job from index: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId} from index`, error);
    }
  }

  @OnEvent('application.created')
  async handleApplicationCreated(application: Application) {
    try {
      await this.indexingService.indexApplication(application);
      this.logger.debug(`Indexed new application: ${application.id}`);
    } catch (error) {
      this.logger.error(`Failed to index application ${application.id}`, error);
    }
  }

  @OnEvent('application.updated')
  async handleApplicationUpdated(application: Application) {
    try {
      await this.indexingService.indexApplication(application);
      this.logger.debug(`Re-indexed updated application: ${application.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to re-index application ${application.id}`,
        error,
      );
    }
  }

  @OnEvent('application.deleted')
  async handleApplicationDeleted(applicationId: string) {
    try {
      await this.indexingService.deleteDocument('applications', applicationId);
      this.logger.debug(`Removed application from index: ${applicationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove application ${applicationId} from index`,
        error,
      );
    }
  }

  @OnEvent('note.created')
  async handleNoteCreated(note: ApplicationNote) {
    try {
      await this.indexingService.indexNote(note);
      this.logger.debug(`Indexed new note: ${note.id}`);
    } catch (error) {
      this.logger.error(`Failed to index note ${note.id}`, error);
    }
  }

  @OnEvent('note.updated')
  async handleNoteUpdated(note: ApplicationNote) {
    try {
      await this.indexingService.indexNote(note);
      this.logger.debug(`Re-indexed updated note: ${note.id}`);
    } catch (error) {
      this.logger.error(`Failed to re-index note ${note.id}`, error);
    }
  }

  @OnEvent('note.deleted')
  async handleNoteDeleted(noteId: string) {
    try {
      await this.indexingService.deleteDocument('notes', noteId);
      this.logger.debug(`Removed note from index: ${noteId}`);
    } catch (error) {
      this.logger.error(`Failed to remove note ${noteId} from index`, error);
    }
  }

  @OnEvent('tenant.deleted')
  async handleTenantDeleted(tenantId: string) {
    try {
      // Delete all documents for the tenant
      const indices = ['candidates', 'jobs', 'applications', 'notes'];

      for (const index of indices) {
        await this.indexingService.elasticsearchService.deleteByQuery({
          index,
          body: {
            query: {
              term: { tenant_id: tenantId },
            },
          },
        });
      }

      this.logger.log(`Removed all documents for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove documents for tenant ${tenantId}`,
        error,
      );
    }
  }

  @OnEvent('search.reindex')
  async handleReindexRequest(data: { tenantId?: string }) {
    try {
      await this.indexingService.reindexAll(data.tenantId);
      this.logger.log(
        `Completed reindex for tenant: ${data.tenantId || 'all'}`,
      );
    } catch (error) {
      this.logger.error(`Failed to reindex for tenant ${data.tenantId}`, error);
    }
  }
}
