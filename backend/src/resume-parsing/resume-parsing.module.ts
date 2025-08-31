import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeUploadController } from './controllers/resume-upload.controller';
import { ResumePipelineController } from './controllers/resume-pipeline.controller';
import { ResumeUploadService } from './services/resume-upload.service';
import { ResumePipelineService } from './services/resume-pipeline.service';
import { FileStorageService } from './services/file-storage.service';
import { OpenAIService } from './services/openai.service';
import { ResumeProcessingService } from './services/resume-processing.service';
import { ResumeProcessingProcessor } from './processors/resume-processing.processor';
import { Candidate } from '../entities/candidate.entity';
import { ParsedResumeData } from '../entities/parsed-resume-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate, ParsedResumeData]),
    BullModule.registerQueue({
      name: 'resume-processing',
    }),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
        },
        fileFilter: (req, file, callback) => {
          const allowedMimes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'image/jpeg',
            'image/png',
            'image/gif',
          ];

          if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(
              new Error(
                'Invalid file type. Only PDF, DOCX, DOC, and image files are allowed.',
              ),
              false,
            );
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ResumeUploadController, ResumePipelineController],
  providers: [
    ResumeUploadService,
    ResumePipelineService,
    FileStorageService,
    OpenAIService,
    ResumeProcessingService,
    ResumeProcessingProcessor,
  ],
  exports: [
    ResumeUploadService,
    ResumePipelineService,
    FileStorageService,
    OpenAIService,
    ResumeProcessingService,
  ],
})
export class ResumeParsingModule {}
