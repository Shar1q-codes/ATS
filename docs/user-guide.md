# AI-Native ATS User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Job Management](#job-management)
4. [Candidate Management](#candidate-management)
5. [Application Pipeline](#application-pipeline)
6. [AI Matching System](#ai-matching-system)
7. [Communication System](#communication-system)
8. [Analytics and Reporting](#analytics-and-reporting)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- JavaScript enabled

### First Time Setup

1. **Account Registration**
   - Navigate to the registration page
   - Provide your email, name, and create a secure password
   - Select your role (Admin, Recruiter, or Hiring Manager)
   - Verify your email address

2. **Initial Configuration**
   - Set up your company profile
   - Configure email templates
   - Import existing candidate data (if applicable)

## User Roles and Permissions

### Admin

- Full system access
- User management
- System configuration
- Analytics and reporting
- Company profile management

### Recruiter

- Job posting management
- Candidate management
- Application pipeline management
- Communication with candidates
- Basic analytics

### Hiring Manager

- View assigned job postings
- Review candidate applications
- Provide feedback on candidates
- Limited analytics access

## Job Management

### Creating Job Families

Job families are templates for similar roles across different companies.

1. Navigate to **Jobs > Job Families**
2. Click **"Create New Family"**
3. Fill in the details:
   - **Name**: e.g., "Software Engineer"
   - **Description**: Brief overview of the role type
   - **Skill Categories**: Relevant skill areas
4. Click **"Save"**

### Creating Job Templates

Job templates define specific levels within a job family.

1. Go to **Jobs > Job Templates**
2. Click **"Create New Template"**
3. Select the **Job Family**
4. Configure:
   - **Name**: e.g., "Senior Software Engineer"
   - **Level**: Junior, Mid, Senior, Lead, Principal
   - **Experience Range**: Minimum and maximum years
   - **Base Requirements**: Core skills and qualifications
5. Click **"Save"**

### Company Job Variants

Customize job templates for specific companies.

1. Navigate to **Jobs > Job Variants**
2. Click **"Create Variant"**
3. Select:
   - **Job Template**
   - **Company Profile**
4. Customize:
   - **Additional Requirements**
   - **Modified Requirements**
   - **Custom Job Description**
5. **Publish** when ready

## Candidate Management

### Resume Upload and Parsing

The system automatically extracts information from resumes using AI.

1. Go to **Candidates > Upload Resume**
2. **Drag and drop** or **browse** for resume files
3. Supported formats: PDF, DOCX, DOC, JPG, PNG
4. Enter candidate's **email address**
5. Click **"Upload and Parse"**

The system will:

- Extract skills, experience, education, and certifications
- Calculate total years of experience
- Generate skill embeddings for matching

### Manual Candidate Entry

1. Navigate to **Candidates > Add New**
2. Fill in candidate information:
   - Personal details
   - Contact information
   - Skills and experience
   - Education and certifications
3. Click **"Save Candidate"**

### Candidate Search and Filtering

Use the powerful search functionality to find candidates:

- **Text Search**: Name, email, skills
- **Skill Filters**: Specific technical skills
- **Experience Range**: Years of experience
- **Education Level**: Degree requirements
- **Location**: Geographic filters

## Application Pipeline

### Pipeline Stages

The default pipeline includes:

1. **Applied**: Initial application received
2. **Screening**: Resume review and initial assessment
3. **Shortlisted**: Candidates selected for further review
4. **Interview Scheduled**: Interview arranged
5. **Interview Completed**: Interview finished, awaiting decision
6. **Offer Extended**: Job offer made
7. **Offer Accepted**: Candidate accepted offer
8. **Hired**: Candidate successfully onboarded

### Managing Applications

#### Kanban View

- Drag and drop candidates between stages
- View all applications at a glance
- Quick actions for common tasks

#### Individual Application Management

1. Click on any candidate card
2. View detailed information:
   - AI match score and explanation
   - Resume and parsed data
   - Application history
   - Notes and feedback
3. Actions available:
   - Move to next/previous stage
   - Add notes
   - Send email
   - Schedule interview
   - Reject with reason

### Adding Notes and Feedback

1. Open candidate application
2. Click **"Add Note"**
3. Select note type:
   - **General**: General observations
   - **Interview**: Interview feedback
   - **Technical**: Technical assessment
   - **Cultural**: Culture fit assessment
4. Write your feedback
5. Click **"Save Note"**

## AI Matching System

### How Matching Works

The AI matching system uses:

- **Semantic similarity**: Understanding skill relationships
- **Requirement constraints**: MUST/SHOULD/NICE categories
- **Experience weighting**: Years of experience consideration
- **Context awareness**: Industry and role-specific matching

### Understanding Match Scores

- **90-100**: Excellent fit, highly recommended
- **80-89**: Very good fit, strong candidate
- **70-79**: Good fit, worth considering
- **60-69**: Moderate fit, may need development
- **Below 60**: Poor fit, likely not suitable

### Match Explanations

Each match includes:

- **Overall Score**: Composite fit score
- **Breakdown**: MUST/SHOULD/NICE requirement scores
- **Strengths**: What the candidate does well
- **Gaps**: Areas where candidate falls short
- **Recommendations**: Suggestions for decision making

### Improving Match Accuracy

1. **Refine Job Requirements**:
   - Be specific about required skills
   - Properly categorize MUST vs SHOULD vs NICE
   - Include relevant experience requirements

2. **Enhance Candidate Profiles**:
   - Ensure complete skill listings
   - Accurate experience descriptions
   - Up-to-date certifications

## Communication System

### Email Templates

Create reusable email templates for common scenarios:

1. Go to **Communication > Email Templates**
2. Click **"Create Template"**
3. Configure:
   - **Name**: Template identifier
   - **Subject**: Email subject line
   - **Body**: Email content with merge fields
   - **Type**: Application stage or purpose
4. Use merge fields like `{{candidateName}}`, `{{jobTitle}}`

### Sending Emails

#### Individual Emails

1. Open candidate application
2. Click **"Send Email"**
3. Select template or compose custom message
4. Review and customize content
5. Click **"Send"**

#### Bulk Emails

1. Navigate to **Communication > Bulk Email**
2. Select candidates or filter criteria
3. Choose email template
4. Review recipient list
5. Schedule or send immediately

### Communication History

Track all candidate communications:

- Email delivery status
- Open and click rates
- Response tracking
- Communication timeline

## Analytics and Reporting

### Dashboard Overview

The main dashboard shows:

- **Active Applications**: Current pipeline status
- **Recent Activity**: Latest actions and updates
- **Key Metrics**: Time-to-fill, conversion rates
- **Performance Trends**: Historical data visualization

### Pipeline Analytics

Monitor recruitment efficiency:

- **Time-to-Fill**: Average time from posting to hire
- **Stage Conversion**: Success rates between stages
- **Bottleneck Identification**: Where candidates get stuck
- **Source Performance**: Which channels bring best candidates

### Diversity Metrics

Track diversity and inclusion:

- **Demographic Breakdown**: Gender, ethnicity, age
- **Bias Detection**: Potential bias indicators
- **Representation Goals**: Progress toward targets
- **Fair Hiring Metrics**: Equal opportunity tracking

### Custom Reports

Generate detailed reports:

1. Go to **Analytics > Reports**
2. Select report type:
   - Pipeline Performance
   - Source Analysis
   - Diversity Report
   - Custom Query
3. Set date range and filters
4. Choose format (CSV, PDF)
5. Generate and download

## Best Practices

### Job Posting Optimization

1. **Clear Requirements**: Be specific about must-have vs nice-to-have skills
2. **Realistic Expectations**: Set appropriate experience ranges
3. **Inclusive Language**: Use bias-free job descriptions
4. **Regular Updates**: Keep job postings current

### Candidate Management

1. **Timely Communication**: Respond to candidates promptly
2. **Detailed Notes**: Document all interactions thoroughly
3. **Fair Evaluation**: Use consistent criteria across candidates
4. **Privacy Compliance**: Respect candidate data privacy

### Pipeline Efficiency

1. **Regular Reviews**: Check pipeline status daily
2. **Clear Criteria**: Define stage transition requirements
3. **Automated Workflows**: Use email automation where appropriate
4. **Performance Monitoring**: Track key metrics regularly

### AI Matching Optimization

1. **Quality Data**: Ensure complete candidate and job information
2. **Feedback Loop**: Review and adjust match criteria based on outcomes
3. **Human Oversight**: Use AI as a tool, not replacement for judgment
4. **Continuous Learning**: Monitor match accuracy and improve over time

## Troubleshooting

### Common Issues

#### Resume Parsing Problems

- **Issue**: Resume not parsing correctly
- **Solution**:
  - Ensure file is not corrupted
  - Try different file format
  - Check file size limits
  - Contact support for complex layouts

#### Low Match Scores

- **Issue**: All candidates showing low match scores
- **Solution**:
  - Review job requirements for accuracy
  - Check if requirements are too restrictive
  - Verify candidate skill data completeness
  - Consider adjusting requirement categories

#### Email Delivery Issues

- **Issue**: Emails not being delivered
- **Solution**:
  - Check email addresses for accuracy
  - Verify email service configuration
  - Review spam/bounce reports
  - Contact system administrator

#### Performance Issues

- **Issue**: System running slowly
- **Solution**:
  - Clear browser cache
  - Check internet connection
  - Try different browser
  - Report to technical support

### Getting Help

1. **In-App Help**: Click the help icon for contextual assistance
2. **Documentation**: Refer to this user guide and API documentation
3. **Support Tickets**: Submit detailed issue reports
4. **Training Sessions**: Schedule team training if needed

### System Status

Check system health:

- Visit `/api/health` for system status
- Monitor performance metrics
- Review error logs if you have admin access

## Training Resources

### Video Tutorials

- System overview and navigation
- Job posting creation workflow
- Candidate management best practices
- Pipeline management techniques
- Analytics and reporting features

### Webinars

- Monthly feature updates
- Best practices sharing
- Q&A sessions with product team

### Documentation

- API documentation for developers
- Integration guides
- Advanced configuration options

For additional training resources and support, contact your system administrator or the support team.
