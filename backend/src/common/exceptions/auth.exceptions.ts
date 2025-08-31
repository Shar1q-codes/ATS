import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthException extends HttpException {
  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.UNAUTHORIZED,
  ) {
    super(
      {
        message,
        error: 'Authentication Error',
        code,
      },
      status,
    );
  }
}

export class InvalidCredentialsException extends AuthException {
  constructor() {
    super(
      'The email or password you entered is incorrect. Please try again.',
      'AUTH_INVALID_CREDENTIALS',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class TokenExpiredException extends AuthException {
  constructor() {
    super(
      'Your session has expired. Please log in again.',
      'AUTH_TOKEN_EXPIRED',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InsufficientPermissionsException extends AuthException {
  constructor() {
    super(
      'You do not have permission to perform this action.',
      'AUTH_INSUFFICIENT_PERMISSIONS',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AccountLockedException extends AuthException {
  constructor() {
    super(
      'Your account has been temporarily locked due to multiple failed login attempts.',
      'AUTH_ACCOUNT_LOCKED',
      HttpStatus.FORBIDDEN,
    );
  }
}

export class EmailAlreadyExistsException extends AuthException {
  constructor() {
    super(
      'An account with this email address already exists.',
      'VALIDATION_EMAIL_EXISTS',
      HttpStatus.CONFLICT,
    );
  }
}

export class WeakPasswordException extends AuthException {
  constructor() {
    super(
      'Your password does not meet the security requirements. Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
      'VALIDATION_WEAK_PASSWORD',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidRefreshTokenException extends AuthException {
  constructor() {
    super(
      'Invalid or expired refresh token. Please log in again.',
      'AUTH_INVALID_REFRESH_TOKEN',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class OrganizationCreationFailedException extends AuthException {
  constructor() {
    super(
      'Failed to create organization during registration. Please try again.',
      'ORGANIZATION_CREATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
