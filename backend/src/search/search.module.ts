import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { IndexingService } from './services/indexing.service';
import { SavedSearchService } from './services/saved-search.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { SemanticSearchController } from './controllers/semantic-search.controller';
import { SearchIndexingListenerService } from './services/search-indexing-listener.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedSearch } from '../entities/saved-search.entity';
import { Candidate } from '../entities/candidate.entity';
import { JobFamily } from '../entities/job-family.entity';
import { Application } from '../entities/application.entity';
import { ApplicationNote } from '../entities/application-note.entity';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node:
          configService.get('ELASTICSEARCH_NODE') || 'http://localhost:9200',
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME') || 'elastic',
          password: configService.get('ELASTICSEARCH_PASSWORD') || 'changeme',
        },
        maxRetries: 3,
        requestTimeout: 60000,
        sniffOnStart: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      SavedSearch,
      Candidate,
      JobFamily,
      Application,
      ApplicationNote,
    ]),
  ],
  providers: [
    SearchService,
    IndexingService,
    SavedSearchService,
    SemanticSearchService,
    SearchIndexingListenerService,
  ],
  controllers: [SearchController, SemanticSearchController],
  exports: [SearchService, IndexingService, SemanticSearchService],
})
export class SearchModule {}
