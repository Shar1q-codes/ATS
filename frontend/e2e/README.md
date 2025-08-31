# End-to-End Testing Guide

This directory contains end-to-end tests for the AI-native ATS application using Playwright.

## Setup

### Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database running
3. Backend server running on port 3001
4. Frontend server running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Configuration

Copy `.env.e2e` and configure the following variables:

- `E2E_BASE_URL`: Frontend application URL (default: http://localhost:3000)
- `BACKEND_BASE_URL`: Backend API URL (default: http://localhost:3001)
- `TEST_DB_*`: Test database connection details

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Interactive Mode

```bash
npm run test:e2e:ui
```

### Headed Mode (with browser UI)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Report

```bash
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── auth-states/          # Saved authentication states
├── fixtures/             # Test data and files
│   ├── files/           # Sample files for upload tests
│   └── test-data.ts     # Test data constants
├── tests/               # Test files
│   ├── auth/           # Authentication tests
│   ├── candidates/     # Candidate management tests
│   ├── jobs/           # Job management tests
│   ├── applications/   # Application pipeline tests
│   ├── analytics/      # Analytics dashboard tests
│   └── accessibility/ # Accessibility tests
├── utils/              # Test utilities
│   ├── test-database.ts    # Database utilities
│   ├── test-data-seeder.ts # Test data seeding
│   └── test-helpers.ts     # Common test helpers
├── global-setup.ts     # Global test setup
├── global-teardown.ts  # Global test cleanup
└── README.md          # This file
```

## Test Categories

### 1. Authentication Tests

- User registration and login flows
- Role-based access control
- Session management
- Password reset functionality

### 2. Candidate Management Tests

- Resume upload and parsing
- Candidate profile creation and editing
- Search and filtering functionality
- Bulk operations

### 3. Job Management Tests

- Job family creation and management
- Job template configuration
- Company profile setup
- Job variant creation and publishing

### 4. Application Pipeline Tests

- Application creation and status tracking
- Kanban board drag-and-drop functionality
- Stage transitions and history
- Note-taking and communication

### 5. Analytics Tests

- Dashboard data visualization
- Report generation and export
- Performance metrics accuracy
- Real-time data updates

### 6. Accessibility Tests

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation

## Test Data Management

### Database Setup

Tests use isolated test databases that are created and destroyed for each test run:

1. **Global Setup**: Creates test database and seeds initial data
2. **Test Execution**: Each test can modify data as needed
3. **Global Teardown**: Cleans up test database

### Authentication States

Pre-authenticated user states are saved during global setup:

- `admin.json`: Admin user authentication
- `recruiter.json`: Recruiter user authentication
- `hiring-manager.json`: Hiring manager authentication

### Test Data Seeding

The `TestDataSeeder` class provides:

- Test user accounts with different roles
- Sample job families and templates
- Test candidate profiles
- Sample applications and pipeline data

## Best Practices

### Writing Tests

1. Use descriptive test names that explain the user journey
2. Follow the AAA pattern (Arrange, Act, Assert)
3. Use data-testid attributes for reliable element selection
4. Keep tests independent and idempotent
5. Use page object models for complex interactions

### Test Organization

1. Group related tests in the same file
2. Use `test.describe()` blocks for logical grouping
3. Share common setup using `test.beforeEach()`
4. Clean up test data in `test.afterEach()` if needed

### Performance

1. Use `test.parallel()` for independent tests
2. Reuse authentication states when possible
3. Mock external API calls for faster execution
4. Use appropriate timeouts and waits

## Debugging

### Visual Debugging

```bash
# Run with browser UI visible
npm run test:e2e:headed

# Run in debug mode with step-by-step execution
npm run test:e2e:debug
```

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for failed tests
- Traces are captured for debugging

### Logs and Reports

- Test results are saved in `test-results/`
- HTML reports are generated in `playwright-report/`
- Console logs and network requests are captured

## CI/CD Integration

Tests run automatically on:

- Pull requests to main/develop branches
- Pushes to main/develop branches

The CI pipeline:

1. Sets up PostgreSQL database
2. Starts backend and frontend servers
3. Runs all E2E tests
4. Uploads test artifacts (reports, screenshots, videos)

## Troubleshooting

### Common Issues

**Database Connection Errors**

- Ensure PostgreSQL is running
- Check database credentials in `.env.e2e`
- Verify database permissions

**Server Not Starting**

- Check if ports 3000/3001 are available
- Verify backend/frontend build processes
- Check environment variables

**Test Timeouts**

- Increase timeout values in `playwright.config.ts`
- Check for slow network requests
- Verify test data setup is complete

**Authentication Failures**

- Clear saved auth states in `e2e/auth-states/`
- Verify test user credentials
- Check JWT token configuration

### Getting Help

1. Check the Playwright documentation: https://playwright.dev/
2. Review test logs in `test-results/`
3. Use the HTML report for detailed test information
4. Enable debug mode for step-by-step execution
