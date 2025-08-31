# AI-Native ATS API Documentation

## Overview

The AI-Native ATS provides a comprehensive RESTful API for managing recruitment processes, from job posting creation to candidate matching and pipeline management.

## Base URL

```
http://localhost:3001/api
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting Started

1. **Register a new user**:

   ```bash
   POST /auth/register
   ```

2. **Login to get JWT token**:

   ```bash
   POST /auth/login
   ```

3. **Use the token for authenticated requests**

## API Endpoints

### Authentication Endpoints

#### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "recruiter"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "recruiter"
    }
  }
}
```

#### POST /auth/login

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "recruiter"
    }
  }
}
```

### Health Check Endpoints

#### GET /health

Check overall application health including database, memory, and disk usage.

#### GET /health/ready

Check if the application is ready to serve requests.

#### GET /health/live

Check if the application is alive and responsive.

### Job Management Endpoints

#### Job Families

##### GET /job-families

Retrieve all job families.

##### POST /job-families

Create a new job family.

**Request Body:**

```json
{
  "name": "Software Engineer",
  "description": "Software development roles",
  "skillCategories": ["Programming", "Problem Solving", "Communication"]
}
```

##### GET /job-families/:id

Get a specific job family by ID.

##### PUT /job-families/:id

Update a job family.

##### DELETE /job-families/:id

Delete a job family.

#### Job Templates

##### GET /job-templates

Retrieve all job templates.

##### POST /job-templates

Create a new job template.

**Request Body:**

```json
{
  "jobFamilyId": "uuid",
  "name": "Senior Software Engineer",
  "level": "senior",
  "experienceRange": {
    "min": 5,
    "max": 8
  },
  "salaryRange": {
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  }
}
```

### Resume Parsing Endpoints

#### POST /resume-parsing/upload

Upload and parse a resume file.

**Request:** Multipart form data

- `file`: Resume file (PDF, DOCX, or image)
- `candidateEmail`: Email address of the candidate

**Response:**

```json
{
  "success": true,
  "data": {
    "candidate": {
      "id": "uuid",
      "email": "candidate@example.com",
      "parsedData": {
        "skills": ["JavaScript", "React", "Node.js"],
        "experience": [...],
        "education": [...],
        "totalExperience": 5
      }
    }
  }
}
```

### Candidate Management Endpoints

#### GET /candidates

Retrieve all candidates with optional filtering.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term for name or email
- `skills`: Filter by skills (comma-separated)

#### GET /candidates/:id

Get a specific candidate by ID.

#### PUT /candidates/:id

Update candidate information.

#### DELETE /candidates/:id

Delete a candidate (with GDPR compliance).

### Application Management Endpoints

#### GET /applications

Retrieve all applications with filtering options.

#### POST /applications

Create a new application.

**Request Body:**

```json
{
  "candidateId": "uuid",
  "companyJobVariantId": "uuid"
}
```

#### PATCH /applications/:id

Update application status or add notes.

**Request Body:**

```json
{
  "status": "shortlisted",
  "notes": "Great technical skills, moving to interview stage"
}
```

### Matching Endpoints

#### POST /matching/match-candidate

Get AI-powered match score and explanation for a candidate-job pair.

**Request Body:**

```json
{
  "candidateId": "uuid",
  "companyJobVariantId": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fitScore": 85,
    "explanation": {
      "overallScore": 85,
      "breakdown": {
        "mustHaveScore": 90,
        "shouldHaveScore": 80,
        "niceToHaveScore": 75
      },
      "strengths": ["Strong JavaScript skills", "React experience"],
      "gaps": ["Limited backend experience"],
      "recommendations": ["Consider for frontend-focused role"]
    }
  }
}
```

### Communication Endpoints

#### GET /email-templates

Retrieve all email templates.

#### POST /email-templates

Create a new email template.

#### POST /communication/send-email

Send personalized email to candidates.

**Request Body:**

```json
{
  "templateId": "uuid",
  "recipientId": "uuid",
  "mergeFields": {
    "candidateName": "John Doe",
    "jobTitle": "Senior Software Engineer",
    "companyName": "Tech Corp"
  }
}
```

### Analytics Endpoints

#### GET /analytics/pipeline-metrics

Get pipeline performance metrics.

**Query Parameters:**

- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `companyId`: Filter by company (optional)

#### GET /analytics/source-performance

Get candidate source performance metrics.

#### POST /reporting/generate

Generate and download reports.

**Request Body:**

```json
{
  "reportType": "pipeline_performance",
  "format": "csv",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "filters": {
    "companyId": "uuid"
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Email is required"
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid"
  },
  "retryable": false
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Format:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Testing with Postman

1. Import the provided Postman collection: `postman/AI-Native-ATS.postman_collection.json`
2. Import the environment file: `postman/AI-Native-ATS.postman_environment.json`
3. Update the `base_url` variable if needed
4. Run the "Login" request to automatically set the JWT token
5. Use other requests with automatic authentication

## SDK and Client Libraries

Currently, the API is accessed directly via HTTP requests. Client libraries for popular languages are planned for future releases.

## Support

For API support and questions:

- Check the interactive API documentation at `/api/docs`
- Review the health check endpoints for system status
- Contact the development team for technical issues
