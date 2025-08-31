# AI-Native ATS Frequently Asked Questions (FAQ)

## Table of Contents

1. [General Questions](#general-questions)
2. [Account and Setup](#account-and-setup)
3. [Job Management](#job-management)
4. [AI Matching and Resume Parsing](#ai-matching-and-resume-parsing)
5. [Candidate Management](#candidate-management)
6. [Pipeline and Workflow](#pipeline-and-workflow)
7. [Communication and Email](#communication-and-email)
8. [Analytics and Reporting](#analytics-and-reporting)
9. [Integrations](#integrations)
10. [Security and Compliance](#security-and-compliance)
11. [Troubleshooting](#troubleshooting)
12. [Billing and Pricing](#billing-and-pricing)

## General Questions

### What is an AI-Native ATS?

An AI-Native ATS is an Applicant Tracking System built from the ground up to leverage artificial intelligence for resume parsing, candidate matching, and process automation. Unlike traditional ATS systems with AI features added on, our system uses AI as a core component of every major function.

### Who is this system designed for?

The AI-Native ATS is designed for:

- Small to medium businesses (SMBs)
- Startups with fewer than 100 employees
- Recruitment agencies
- Growing companies looking to scale their hiring processes
- Organizations wanting to reduce bias in hiring

### What makes this ATS different from others?

Key differentiators include:

- **Job Variation Model**: Create job variants without duplicating entire postings
- **Explainable AI Matching**: Transparent fit scores with detailed explanations
- **Bias Reduction**: Built-in tools to promote fair hiring practices
- **CRM-Ready Architecture**: Designed for future expansion into candidate relationship management
- **Modern Interface**: Intuitive, mobile-responsive design

### What browsers are supported?

Supported browsers include:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers on iOS and Android

### Is there a mobile app?

Currently, we offer a mobile-responsive web application that works well on smartphones and tablets. A dedicated mobile app is planned for future release.

## Account and Setup

### How do I get started?

1. Receive your invitation email or access credentials
2. Complete account registration and profile setup
3. Configure your company profile
4. Invite team members and assign roles
5. Follow the onboarding guide for step-by-step setup

### What user roles are available?

Three main roles are available:

- **Admin**: Full system access, user management, configuration
- **Recruiter**: Job posting, candidate management, pipeline operations
- **Hiring Manager**: Review candidates, provide feedback, limited access

### Can I customize user permissions?

Yes, you can customize permissions within each role to match your organization's needs. Contact your administrator or support team for advanced permission configurations.

### How do I invite team members?

1. Go to Settings > Users
2. Click "Invite User"
3. Enter email address and select role
4. Send invitation
5. User will receive email with setup instructions

### Can I change my company information later?

Yes, company profile information can be updated at any time through Settings > Company Profile. Some changes may require administrator privileges.

## Job Management

### What is the Job Variation Model?

The Job Variation Model allows you to create job postings efficiently by:

1. **Job Families**: Groups of similar roles (e.g., "Software Engineer")
2. **Job Templates**: Specific levels within families (e.g., "Senior Software Engineer")
3. **Company Variants**: Customized versions for your specific company needs

This prevents duplication while allowing customization for different companies or departments.

### How do I create my first job posting?

1. Navigate to Jobs > Job Variants
2. Click "Create New Variant"
3. Select or create a Job Template
4. Choose your Company Profile
5. Customize requirements and description
6. Review and publish

### What are MUST, SHOULD, and NICE requirements?

- **MUST**: Essential requirements that candidates must have (deal-breakers)
- **SHOULD**: Important requirements that significantly impact fit score
- **NICE**: Bonus requirements that provide additional value but aren't critical

This categorization helps the AI matching system prioritize requirements appropriately.

### Can I use my existing job descriptions?

Yes, you can:

1. Copy and paste existing job descriptions
2. Use our AI to extract requirements automatically
3. Manually convert descriptions to our structured format
4. Import job data through CSV upload (contact support)

### How do I manage multiple locations or departments?

Create separate Company Profiles for different locations or departments, then create job variants specific to each. This allows for location-specific requirements and customization.

## AI Matching and Resume Parsing

### How accurate is the resume parsing?

Our AI resume parsing typically achieves:

- 90%+ accuracy for skills extraction
- 85%+ accuracy for experience calculation
- 95%+ accuracy for education and certifications

Accuracy varies based on resume format and quality. You can always manually correct any parsing errors.

### What file formats are supported for resume upload?

Supported formats include:

- PDF (preferred)
- DOCX and DOC
- JPG and PNG (with OCR)
- TXT (plain text)

### How does the AI matching work?

The AI matching system:

1. Converts skills and requirements into semantic embeddings
2. Calculates similarity scores using advanced algorithms
3. Applies MUST/SHOULD/NICE constraint logic
4. Generates overall fit score (0-100)
5. Provides detailed explanations for the score

### What does a good match score look like?

Score interpretation:

- **90-100**: Excellent fit, highly recommended
- **80-89**: Very good fit, strong candidate
- **70-79**: Good fit, worth considering
- **60-69**: Moderate fit, may need development
- **Below 60**: Poor fit, likely not suitable

### Can I improve match accuracy?

Yes, you can improve accuracy by:

- Writing clear, specific job requirements
- Properly categorizing requirements (MUST/SHOULD/NICE)
- Ensuring complete candidate profiles
- Providing feedback on match results
- Regularly updating skill taxonomies

### Why are all my match scores low?

Common causes and solutions:

- **Requirements too restrictive**: Review and adjust MUST requirements
- **Incomplete candidate profiles**: Enhance candidate data
- **Skill mismatch**: Check if you're using the right skill terms
- **Template issues**: Verify job template configuration

## Candidate Management

### How do I add candidates to the system?

Three ways to add candidates:

1. **Resume Upload**: Upload resume files for automatic parsing
2. **Manual Entry**: Enter candidate information directly
3. **Bulk Import**: Import multiple candidates via CSV (contact support)

### Can candidates apply directly through the system?

Yes, published job postings include application forms where candidates can:

- Upload their resumes
- Fill out basic information
- Submit applications directly
- Track their application status

### How do I handle candidate consent and privacy?

The system includes built-in consent management:

- Candidates provide explicit consent during application
- Consent status is tracked for each candidate
- Data can be deleted upon request (GDPR compliance)
- Privacy settings can be configured per candidate

### Can I search for candidates across all jobs?

Yes, the global candidate search allows you to:

- Search across all candidates in your system
- Filter by skills, experience, location, etc.
- Find candidates suitable for multiple positions
- Create talent pools for future opportunities

### How do I handle duplicate candidates?

The system includes duplicate detection:

- Automatic detection based on email and name
- Merge functionality for confirmed duplicates
- Manual review process for potential duplicates
- Prevention of duplicate applications

## Pipeline and Workflow

### What are the default pipeline stages?

Default stages include:

1. Applied
2. Screening
3. Shortlisted
4. Interview Scheduled
5. Interview Completed
6. Offer Extended
7. Offer Accepted
8. Hired

You can customize these stages to match your process.

### Can I customize the pipeline stages?

Yes, you can:

- Rename existing stages
- Add custom stages
- Remove unused stages
- Set up stage-specific actions and requirements
- Configure approval workflows

### How do I move candidates through the pipeline?

Multiple ways to move candidates:

- **Drag and drop** in Kanban view
- **Bulk operations** for multiple candidates
- **Individual actions** from candidate profiles
- **Automated transitions** based on rules

### Can I set up automated workflows?

Yes, you can create automated workflows for:

- Email notifications at stage transitions
- Task assignments to team members
- Reminder notifications for follow-ups
- Status updates to candidates

### How do I track candidate feedback and notes?

The system provides comprehensive note-taking:

- Stage-specific notes
- Categorized feedback (technical, cultural, etc.)
- Private notes (visible to team only)
- Candidate-visible feedback
- Interview scorecards and evaluations

## Communication and Email

### How do I set up email integration?

1. Go to Settings > Integrations > Email
2. Choose your email service provider
3. Enter API credentials or SMTP settings
4. Test the connection
5. Configure sender information and branding

### What email services are supported?

Supported email services include:

- Postmark (recommended)
- SendGrid
- Amazon SES
- Mailgun
- SMTP (any provider)

### Can I create custom email templates?

Yes, you can create templates for:

- Application confirmations
- Interview invitations
- Status updates
- Rejection notifications
- Offer letters
- Custom scenarios

Templates support merge fields for personalization.

### How do I track email performance?

Email tracking includes:

- Delivery status
- Open rates
- Click-through rates
- Bounce and spam reports
- Response tracking
- Performance analytics

### Can I send bulk emails to candidates?

Yes, bulk email functionality allows you to:

- Select multiple candidates
- Choose or create email templates
- Personalize messages with merge fields
- Schedule sending for optimal timing
- Track performance across the campaign

## Analytics and Reporting

### What analytics are available?

Available analytics include:

- **Pipeline Performance**: Time-to-fill, conversion rates, bottlenecks
- **Source Analysis**: Which channels bring the best candidates
- **Diversity Metrics**: Demographic breakdowns and bias detection
- **Match Accuracy**: AI performance and optimization opportunities
- **Team Performance**: Individual and team productivity metrics

### How do I generate reports?

To generate reports:

1. Go to Analytics > Reports
2. Select report type
3. Set date range and filters
4. Choose format (PDF, CSV, Excel)
5. Generate and download

### Can I schedule automated reports?

Yes, you can schedule reports to be:

- Generated automatically (daily, weekly, monthly)
- Sent to specific team members
- Delivered via email or dashboard
- Customized with specific metrics and filters

### What diversity metrics are tracked?

Diversity tracking includes:

- Gender representation
- Ethnic and racial diversity
- Age distribution
- Educational background diversity
- Geographic diversity
- Bias detection indicators

### How do I measure hiring success?

Key success metrics include:

- Time-to-fill by position and department
- Cost-per-hire calculations
- Quality-of-hire indicators
- Candidate satisfaction scores
- Hiring manager satisfaction
- Retention rates of new hires

## Integrations

### What integrations are available?

Current integrations include:

- **Email Services**: Postmark, SendGrid, Amazon SES
- **Calendar Systems**: Google Calendar, Outlook
- **Job Boards**: Indeed, LinkedIn, Glassdoor
- **Background Check**: Various providers
- **HRIS Systems**: BambooHR, Workday, others

### How do I set up job board posting?

1. Go to Settings > Integrations > Job Boards
2. Select job board and authenticate
3. Configure posting templates
4. Set up automatic posting rules
5. Test with a sample job posting

### Can I integrate with my existing HRIS?

Yes, we offer integrations with popular HRIS systems. Contact our support team to discuss:

- Available integrations for your HRIS
- Custom integration development
- Data migration assistance
- Ongoing synchronization setup

### Is there an API available?

Yes, we provide a comprehensive REST API for:

- Custom integrations
- Data import/export
- Workflow automation
- Third-party tool connections

API documentation is available in the developer section.

### How do I request a new integration?

To request new integrations:

1. Submit a feature request through the system
2. Contact our support team with details
3. Provide information about the target system
4. Discuss timeline and implementation options

## Security and Compliance

### Is my data secure?

Yes, we implement enterprise-grade security:

- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Access Control**: Role-based permissions and authentication
- **Infrastructure**: SOC 2 compliant hosting
- **Monitoring**: 24/7 security monitoring and alerts
- **Backups**: Automated, encrypted backups

### What compliance standards do you meet?

We comply with:

- **GDPR**: European data protection regulation
- **CCPA**: California Consumer Privacy Act
- **SOC 2**: Security and availability standards
- **PIPEDA**: Canadian privacy legislation
- **Industry Standards**: Following recruitment industry best practices

### How do you handle candidate data privacy?

Data privacy measures include:

- Explicit consent collection and tracking
- Right to be forgotten (data deletion)
- Data minimization principles
- Purpose limitation for data use
- Regular privacy impact assessments

### Can I control who sees candidate data?

Yes, through role-based access control:

- Restrict access by user role
- Limit visibility to specific jobs or departments
- Configure field-level permissions
- Set up approval workflows for sensitive data
- Audit trail for all data access

### How do I delete candidate data?

To delete candidate data:

1. Navigate to candidate profile
2. Click "Data Management" options
3. Select "Delete Candidate Data"
4. Confirm deletion request
5. System will remove all associated data

This supports GDPR "right to be forgotten" requirements.

## Troubleshooting

### The system is running slowly. What should I do?

Try these steps:

1. **Clear browser cache** and cookies
2. **Check internet connection** speed
3. **Try a different browser** or incognito mode
4. **Disable browser extensions** temporarily
5. **Contact support** if issues persist

### Resume parsing isn't working correctly. How do I fix it?

Common solutions:

1. **Check file format** - use PDF when possible
2. **Verify file size** - ensure under size limits
3. **Review file quality** - avoid scanned or low-quality images
4. **Try different format** - convert to PDF or DOCX
5. **Manual correction** - edit parsed data directly

### I'm not receiving email notifications. What's wrong?

Check these items:

1. **Email settings** in your profile
2. **Spam/junk folder** for system emails
3. **Email integration** configuration
4. **Notification preferences** settings
5. **Contact support** for delivery issues

### Match scores seem inaccurate. How do I improve them?

To improve match accuracy:

1. **Review job requirements** for clarity and accuracy
2. **Check requirement categorization** (MUST/SHOULD/NICE)
3. **Enhance candidate profiles** with complete information
4. **Provide feedback** on match results
5. **Contact support** for algorithm adjustments

### I can't access certain features. Why?

Access issues may be due to:

1. **User role permissions** - check with administrator
2. **Feature availability** in your plan
3. **Browser compatibility** issues
4. **Temporary system maintenance**
5. **Account status** or billing issues

## Billing and Pricing

### What pricing plans are available?

We offer flexible pricing plans:

- **Starter**: Basic features for small teams
- **Professional**: Advanced features for growing companies
- **Enterprise**: Full features with custom integrations
- **Custom**: Tailored solutions for large organizations

Contact sales for detailed pricing information.

### How is usage calculated?

Usage is typically calculated based on:

- Number of active users
- Number of job postings
- Candidate processing volume
- API calls and integrations
- Storage usage

### Can I change my plan?

Yes, you can:

- Upgrade or downgrade plans anytime
- Add or remove users as needed
- Adjust features based on requirements
- Contact support for plan changes

### What payment methods are accepted?

Accepted payment methods include:

- Credit cards (Visa, MasterCard, American Express)
- ACH/bank transfers
- Wire transfers for enterprise accounts
- Purchase orders for qualified organizations

### Is there a free trial available?

Yes, we offer:

- 14-day free trial with full features
- No credit card required to start
- Full support during trial period
- Easy conversion to paid plan

## Getting Additional Help

### How do I contact support?

Multiple support channels available:

- **Live Chat**: Available during business hours
- **Email Support**: support@ai-native-ats.com
- **Phone Support**: For urgent issues
- **Help Center**: Self-service knowledge base

### What information should I include in support requests?

Include these details:

- Your account information
- Detailed description of the issue
- Steps you've already tried
- Screenshots or error messages
- Browser and operating system information

### Are there training resources available?

Yes, we provide:

- **User guides** and documentation
- **Video tutorials** for key features
- **Webinar training** sessions
- **One-on-one training** for key users
- **Certification programs** for advanced users

### How do I provide feedback or request features?

You can:

- Use the in-app feedback form
- Email suggestions to feedback@ai-native-ats.com
- Participate in user surveys
- Join our user community forums
- Schedule feedback calls with our product team

### Where can I find system updates and announcements?

Stay informed through:

- **In-app notifications** for important updates
- **Email newsletters** with feature announcements
- **Release notes** in the help center
- **Social media** channels for company news
- **User community** forums for discussions

---

_This FAQ is regularly updated based on user questions and system changes. If you can't find the answer to your question, please contact our support team for assistance._
