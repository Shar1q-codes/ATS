/**
 * Environment configuration validation utilities
 */

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  databaseUrl: string;
  redisUrl?: string;
  openaiApiKey?: string;
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'] as const;

/**
 * Validates and returns environment configuration
 * Throws error if required environment variables are missing
 */
export function getEnvConfig(): EnvConfig {
  // Check for required environment variables
  const missingVars = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`,
    );
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security',
    );
  }

  // Validate PORT if provided
  const port = parseInt(process.env.PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid port number between 1 and 65535');
  }

  // Validate CORS_ORIGIN format
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  if (corsOrigin !== '*') {
    try {
      new URL(corsOrigin);
    } catch (error) {
      throw new Error(
        `CORS_ORIGIN must be a valid URL or '*'. Received: ${corsOrigin}`,
      );
    }
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port,
    corsOrigin,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

/**
 * Gets the CORS origin with validation
 */
export function getCorsOrigin(): string {
  return getEnvConfig().corsOrigin;
}

/**
 * Gets the JWT secret with validation
 */
export function getJwtSecret(): string {
  return getEnvConfig().jwtSecret;
}

/**
 * Gets the database URL with validation
 */
export function getDatabaseUrl(): string {
  return getEnvConfig().databaseUrl;
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnvConfig().nodeEnv === 'development';
}

/**
 * Checks if we're in production mode
 */
export function isProduction(): boolean {
  return getEnvConfig().nodeEnv === 'production';
}

/**
 * Validates environment configuration on app startup
 * Should be called early in the application lifecycle
 */
export function validateEnvironment(): void {
  try {
    const config = getEnvConfig();

    if (isDevelopment()) {
      console.log('[Environment] Configuration validated:', {
        nodeEnv: config.nodeEnv,
        port: config.port,
        corsOrigin: config.corsOrigin,
        hasJwtSecret: !!config.jwtSecret,
        hasDatabaseUrl: !!config.databaseUrl,
        hasRedisUrl: !!config.redisUrl,
        hasOpenaiApiKey: !!config.openaiApiKey,
      });
    }
  } catch (error) {
    console.error('[Environment] Configuration error:', error);
    throw error;
  }
}
