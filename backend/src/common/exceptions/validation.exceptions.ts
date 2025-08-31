import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string, code: string, details?: any) {
    super(
      {
        message,
        error: 'Validation Error',
        code,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileUploadException extends HttpException {
  constructor(message: string, code: string) {
    super(
      {
        message,
        error: 'File Upload Error',
        code,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileTooLargeException extends FileUploadException {
  constructor(maxSize: string = '10MB') {
    super(
      `The file you selected is too large to upload. Please select a file smaller than ${maxSize}.`,
      'FILE_TOO_LARGE',
    );
  }
}

export class InvalidFileTypeException extends FileUploadException {
  constructor(allowedTypes: string[] = ['PDF', 'DOC', 'DOCX']) {
    super(
      `The file type you selected is not supported. Please upload a ${allowedTypes.join(', ')} file.`,
      'FILE_INVALID_TYPE',
    );
  }
}

export class FileUploadFailedException extends FileUploadException {
  constructor() {
    super(
      'There was an error uploading your file. Please try again or contact support if the problem persists.',
      'FILE_UPLOAD_FAILED',
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string = 'resource') {
    super(
      {
        message: `The requested ${resource} could not be found.`,
        error: 'Not Found',
        code: 'RESOURCE_NOT_FOUND',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ResourceAlreadyExistsException extends HttpException {
  constructor(resource: string = 'resource') {
    super(
      {
        message: `A ${resource} with this information already exists.`,
        error: 'Conflict',
        code: 'RESOURCE_ALREADY_EXISTS',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ResourceInUseException extends HttpException {
  constructor(resource: string = 'resource') {
    super(
      {
        message: `This ${resource} cannot be deleted because it is currently being used.`,
        error: 'Conflict',
        code: 'RESOURCE_IN_USE',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class RateLimitExceededException extends HttpException {
  constructor() {
    super(
      {
        message: 'You have made too many requests. Please slow down.',
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
