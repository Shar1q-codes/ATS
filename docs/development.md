# Development Guide

This guide covers the development workflow, coding standards, and best practices for the AI-Native ATS project.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- PostgreSQL (or Supabase account)
- Redis (optional for development)
- OpenAI API key

### Initial Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd ai-native-ats
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

This will start both frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

## Project Structure

```
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # Utility functions and configurations
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Static assets
│   └── tests/            # Frontend tests
├── backend/              # NestJS backend API
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── common/       # Shared utilities
│   │   ├── entities/     # Database entities
│   │   └── dto/          # Data transfer objects
│   └── test/             # Backend tests
├── database/             # Database schema and migrations
├── docs/                 # Documentation
└── .github/              # GitHub Actions workflows
```

## Development Workflow

### Branch Strategy

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

### Commit Convention

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:

```
feat(auth): add JWT authentication
fix(api): resolve user registration validation
docs(readme): update installation instructions
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit with conventional format
3. Write/update tests for new functionality
4. Ensure all tests pass
5. Create pull request to `develop`
6. Request code review
7. Address feedback and merge

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### Frontend (Next.js/React)

- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Use ShadCN/UI components when possible
- Implement responsive design

### Backend (NestJS)

- Use decorators for validation and documentation
- Implement proper error handling
- Use DTOs for request/response validation
- Follow NestJS module structure
- Implement proper logging

### Database

- Use TypeORM entities with proper relationships
- Implement database migrations
- Use proper indexing for performance
- Follow PostgreSQL best practices

## Testing

### Frontend Testing

```bash
cd frontend
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Test structure:

- Unit tests for components and utilities
- Integration tests for API interactions
- E2E tests for critical user flows

### Backend Testing

```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

Test structure:

- Unit tests for services and utilities
- Integration tests for controllers
- E2E tests for complete API workflows

### Test Guidelines

- Write tests for all new functionality
- Maintain minimum 70% code coverage
- Use descriptive test names
- Mock external dependencies
- Test error scenarios

## API Development

### REST API Guidelines

- Use proper HTTP methods and status codes
- Implement consistent error responses
- Use pagination for list endpoints
- Implement proper validation
- Document with Swagger/OpenAPI

### Authentication

- Use JWT tokens for authentication
- Implement role-based access control
- Secure sensitive endpoints
- Handle token refresh properly

### Error Handling

```typescript
// Standard error response format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {...},
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

## Database Development

### Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Entity Guidelines

- Use UUID primary keys
- Include created_at and updated_at timestamps
- Implement proper relationships
- Use appropriate data types
- Add database constraints

## AI Integration

### OpenAI API Usage

- Use environment variables for API keys
- Implement proper error handling
- Add retry logic for transient failures
- Monitor API usage and costs
- Cache results when appropriate

### Resume Parsing

- Support multiple file formats (PDF, DOCX, images)
- Implement confidence scoring
- Handle parsing failures gracefully
- Store raw and parsed data separately

### Matching Algorithm

- Use semantic similarity for skill matching
- Implement explainable scoring
- Support requirement categories (MUST/SHOULD/NICE)
- Provide detailed match explanations

## Performance Optimization

### Frontend

- Use Next.js static generation where possible
- Implement proper caching strategies
- Optimize images and assets
- Use lazy loading for components
- Minimize bundle size

### Backend

- Implement database query optimization
- Use caching for frequently accessed data
- Implement proper pagination
- Use connection pooling
- Monitor API response times

### Database

- Create appropriate indexes
- Optimize complex queries
- Use database views for complex joins
- Monitor query performance
- Implement proper connection management

## Security Best Practices

### Input Validation

- Validate all user inputs
- Use parameterized queries
- Implement rate limiting
- Sanitize file uploads
- Validate file types and sizes

### Authentication & Authorization

- Use secure password hashing
- Implement proper session management
- Use HTTPS in production
- Implement CORS properly
- Validate JWT tokens

### Data Protection

- Encrypt sensitive data
- Implement proper access controls
- Log security events
- Regular security audits
- Follow GDPR/CCPA requirements

## Debugging

### Frontend Debugging

- Use React Developer Tools
- Implement proper error boundaries
- Use browser debugging tools
- Log important state changes
- Use proper error reporting

### Backend Debugging

- Use NestJS built-in logging
- Implement structured logging
- Use debugging tools (VS Code debugger)
- Monitor API requests/responses
- Use proper error tracking

### Database Debugging

- Use query logging in development
- Monitor slow queries
- Use database debugging tools
- Implement proper error handling
- Monitor connection pool usage

## Documentation

### Code Documentation

- Use JSDoc for functions and classes
- Document complex business logic
- Keep README files updated
- Document API endpoints
- Maintain changelog

### API Documentation

- Use Swagger/OpenAPI annotations
- Provide request/response examples
- Document error responses
- Include authentication requirements
- Keep documentation in sync with code

## Deployment

### Development Environment

```bash
# Using Docker Compose
docker-compose up -d

# Manual setup
npm run dev
```

### Staging/Production

- Use CI/CD pipeline for deployments
- Run tests before deployment
- Use environment-specific configurations
- Monitor deployment health
- Implement rollback procedures

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in environment variables
2. **Database connection**: Verify DATABASE_URL format
3. **API errors**: Check backend logs and environment variables
4. **Build failures**: Verify Node.js version and dependencies

### Debug Commands

```bash
# Check application health
curl http://localhost:3001/api/health

# View logs
npm run logs

# Run tests
npm run test

# Check dependencies
npm audit
```
