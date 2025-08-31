import { IsOptional, IsString, IsEmail, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadResumeDto {
  @ApiPropertyOptional({
    description: 'Candidate ID if uploading for existing candidate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Candidate email if creating new candidate',
    example: 'candidate@company.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Candidate first name if creating new candidate',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Candidate last name if creating new candidate',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn URL',
    example: 'https://linkedin.com/in/johndoe',
  })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;
}

export class UploadResumeResponseDto {
  @ApiProperty({
    description: 'Upload job ID for tracking processing status',
    example: 'job_123456789',
  })
  jobId: string;

  @ApiProperty({
    description: 'Candidate ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  candidateId: string;

  @ApiProperty({
    description: 'File URL in storage',
    example:
      'https://storage.supabase.co/bucket/resumes/candidate-123/resume.pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Processing status',
    example: 'queued',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;
}

export class ProcessingStatusDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'job_123456789',
  })
  jobId: string;

  @ApiProperty({
    description: 'Processing status',
    example: 'processing',
    enum: ['queued', 'processing', 'completed', 'failed'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 75,
  })
  progress?: number;

  @ApiPropertyOptional({
    description: 'Error message if processing failed',
    example: 'Failed to extract text from PDF',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Parsed resume data if completed',
  })
  parsedData?: any;
}
