import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessLogicException extends HttpException {
  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        message,
        error: 'Business Logic Error',
        code,
      },
      status,
    );
  }
}

export class AIProcessingFailedException extends BusinessLogicException {
  constructor() {
    super(
      'Unable to process your request using AI services. Please try again or contact support if the issue persists.',
      'AI_PROCESSING_FAILED',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ResumeParsingFailedException extends BusinessLogicException {
  constructor() {
    super(
      'We were unable to extract information from the resume. Please ensure the file is readable and try again, or enter the information manually.',
      'RESUME_PARSING_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class MatchingEngineErrorException extends BusinessLogicException {
  constructor() {
    super(
      'Unable to calculate candidate match scores. Please try again later or contact support.',
      'MATCHING_ENGINE_ERROR',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ServiceUnavailableException extends BusinessLogicException {
  constructor(service: string = 'service') {
    super(
      `The ${service} is temporarily unavailable. Please try again in a few minutes.`,
      'SERVICE_UNAVAILABLE',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ExternalServiceException extends BusinessLogicException {
  constructor(service: string, operation: string) {
    super(
      `Failed to ${operation} with ${service}. Please try again later.`,
      'EXTERNAL_SERVICE_ERROR',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class DataIntegrityException extends BusinessLogicException {
  constructor(details?: string) {
    super(
      `Data integrity violation${details ? `: ${details}` : ''}. Please check your data and try again.`,
      'DATA_INTEGRITY_ERROR',
      HttpStatus.CONFLICT,
    );
  }
}

export class QuotaExceededException extends BusinessLogicException {
  constructor(resource: string) {
    super(
      `You have exceeded your ${resource} quota. Please upgrade your plan or contact support.`,
      'QUOTA_EXCEEDED',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class SubscriptionRequiredException extends BusinessLogicException {
  constructor(feature: string) {
    super(
      `This ${feature} requires a paid subscription. Please upgrade your plan to access this feature.`,
      'SUBSCRIPTION_REQUIRED',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
