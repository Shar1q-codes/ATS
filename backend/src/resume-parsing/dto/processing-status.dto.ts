import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessingStatusResponseDto {
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
    description: 'Processing started timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Processing completed timestamp',
    example: '2023-12-01T10:05:00Z',
  })
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Number of retry attempts',
    example: 1,
  })
  attempts?: number;

  @ApiPropertyOptional({
    description: 'Parsed resume data if completed',
  })
  parsedData?: {
    candidateId: string;
    skills: string[];
    experience: any[];
    education: any[];
    certifications: string[];
    summary?: string;
    totalExperience: number;
  };
}
