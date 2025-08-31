# AI-Native ATS Quick Reference Guide

## Table of Contents

1. [Common Tasks](#common-tasks)
2. [Keyboard Shortcuts](#keyboard-shortcuts)
3. [Quick Actions](#quick-actions)
4. [Status Indicators](#status-indicators)
5. [Error Messages](#error-messages)
6. [API Endpoints](#api-endpoints)
7. [Troubleshooting Checklist](#troubleshooting-checklist)

## Common Tasks

### Job Management

#### Create New Job Posting

```
1. Jobs > Job Variants > Create New Variant
2. Select Job Template
3. Choose Company Profile
4. Customize Requirements
5. Review & Publish
```

#### Modify Existing Job

```
1. Jobs > Job Variants
2. Find job posting
3. Click Edit
4. Make changes
5. Save & Republish
```

#### Deactivate Job Posting

```
1. Jobs > Job Variants
2. Find job posting
3. Click Actions > Deactivate
4. Confirm deactivation
```

### Candidate Management

#### Upload Resume

```
1. Candidates > Upload Resume
2. Drag & drop file or browse
3. Enter candidate email
4. Click "Upload and Parse"
5. Review parsed data
6. Save candidate
```

#### Create Manual Candidate

```
1. Candidates > Add New
2. Fill personal information
3. Add skills and experience
4. Enter education details
5. Save candidate
```

#### Search Candidates

```
1. Candidates > Search
2. Enter search terms
3. Apply filters (skills, experience, location)
4. Review results
5. Select candidates
```

### Application Management

#### Create Application

```
1. Open candidate profile
2. Click "Create Application"
3. Select job posting
4. Review match score
5. Add to pipeline
```

#### Move Candidate Through Pipeline

```
Method 1 (Drag & Drop):
1. Pipeline > Kanban View
2. Drag candidate card to new stage

Method 2 (Individual):
1. Open candidate application
2. Click "Move to [Stage]"
3. Add notes if required
4. Confirm move
```

#### Add Candidate Notes

```
1. Open candidate application
2. Click "Add Note"
3. Select note type
4. Write note content
5. Save note
```

### Communication

#### Send Individual Email

```
1. Open candidate application
2. Click "Send Email"
3. Select template or compose
4. Customize content
5. Send email
```

#### Send Bulk Email

```
1. Communication > Bulk Email
2. Select candidates or filters
3. Choose email template
4. Review recipient list
5. Send or schedule
```

#### Create Email Template

```
1. Communication > Email Templates
2. Click "Create Template"
3. Enter template details
4. Write email content
5. Add merge fields
6. Save template
```

### Analytics and Reporting

#### View Dashboard

```
1. Navigate to Analytics
2. Review key metrics
3. Check trend charts
4. Analyze pipeline health
```

#### Generate Report

```
1. Analytics > Reports
2. Select report type
3. Set date range
4. Apply filters
5. Generate report
6. Download or share
```

#### Export Data

```
1. Navigate to relevant section
2. Select data to export
3. Choose export format (CSV, PDF)
4. Click "Export"
5. Download file
```

## Keyboard Shortcuts

### Global Shortcuts

- `Ctrl + /` - Open help menu
- `Ctrl + K` - Global search
- `Ctrl + Shift + N` - Create new (context-dependent)
- `Esc` - Close modal/dialog
- `Ctrl + S` - Save current form

### Navigation Shortcuts

- `G + D` - Go to Dashboard
- `G + J` - Go to Jobs
- `G + C` - Go to Candidates
- `G + P` - Go to Pipeline
- `G + A` - Go to Analytics

### Pipeline Shortcuts

- `N` - Move to next stage
- `P` - Move to previous stage
- `E` - Edit candidate
- `M` - Send email
- `R` - Add note

### Form Shortcuts

- `Tab` - Next field
- `Shift + Tab` - Previous field
- `Enter` - Submit form (when applicable)
- `Ctrl + Enter` - Save and continue

## Quick Actions

### Candidate Quick Actions

- **Email**: Send quick email to candidate
- **Note**: Add quick note or feedback
- **Move**: Change pipeline stage
- **Schedule**: Schedule interview or call
- **Export**: Export candidate data

### Job Quick Actions

- **Edit**: Modify job posting
- **Duplicate**: Create similar job posting
- **Deactivate**: Stop accepting applications
- **Analytics**: View job performance
- **Share**: Share job posting link

### Application Quick Actions

- **Advance**: Move to next stage
- **Reject**: Reject with reason
- **Interview**: Schedule interview
- **Offer**: Extend job offer
- **Archive**: Archive application

## Status Indicators

### Candidate Status

- 🟢 **Active**: Currently in pipeline
- 🟡 **On Hold**: Temporarily paused
- 🔴 **Rejected**: Not selected
- ✅ **Hired**: Successfully placed
- 📋 **Archived**: Moved to archive

### Job Status

- 🟢 **Active**: Accepting applications
- 🟡 **Draft**: Not yet published
- 🔴 **Closed**: No longer accepting applications
- ⏸️ **Paused**: Temporarily stopped
- 📊 **Filled**: Position filled

### Application Status

- 📝 **Applied**: Initial application
- 👀 **Screening**: Under review
- ⭐ **Shortlisted**: Selected for interview
- 📅 **Interview Scheduled**: Interview arranged
- ✅ **Interview Completed**: Interview finished
- 💼 **Offer Extended**: Job offer made
- 🎉 **Hired**: Offer accepted

### Email Status

- ✅ **Delivered**: Successfully delivered
- 📖 **Opened**: Email opened by recipient
- 🔗 **Clicked**: Links clicked in email
- ⚠️ **Bounced**: Delivery failed
- 🚫 **Spam**: Marked as spam

### Match Score Colors

- 🟢 **Green (80-100%)**: Excellent/Very Good fit
- 🟡 **Yellow (60-79%)**: Good/Moderate fit
- 🔴 **Red (0-59%)**: Poor fit

## Error Messages

### Common Error Messages and Solutions

#### "Resume parsing failed"

**Cause**: File format not supported or corrupted
**Solution**:

- Use PDF or DOCX format
- Ensure file is not corrupted
- Try different file

#### "Email delivery failed"

**Cause**: Invalid email address or service issue
**Solution**:

- Verify email address format
- Check email service status
- Try sending to different address

#### "Match score unavailable"

**Cause**: Incomplete candidate or job data
**Solution**:

- Ensure candidate has skills data
- Verify job requirements are complete
- Refresh the page

#### "Permission denied"

**Cause**: Insufficient user permissions
**Solution**:

- Contact administrator
- Verify user role and permissions
- Log out and log back in

#### "Session expired"

**Cause**: User session timed out
**Solution**:

- Log in again
- Save work frequently
- Adjust session timeout settings

## API Endpoints

### Authentication

```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Jobs

```
GET    /api/jobs                 # List all jobs
POST   /api/jobs                 # Create new job
GET    /api/jobs/:id             # Get specific job
PUT    /api/jobs/:id             # Update job
DELETE /api/jobs/:id             # Delete job
```

### Candidates

```
GET    /api/candidates           # List all candidates
POST   /api/candidates           # Create new candidate
GET    /api/candidates/:id       # Get specific candidate
PUT    /api/candidates/:id       # Update candidate
DELETE /api/candidates/:id       # Delete candidate
```

### Applications

```
GET    /api/applications         # List all applications
POST   /api/applications         # Create new application
GET    /api/applications/:id     # Get specific application
PUT    /api/applications/:id     # Update application
DELETE /api/applications/:id     # Delete application
```

### Resume Parsing

```
POST   /api/resume/upload        # Upload and parse resume
GET    /api/resume/:id/status    # Check parsing status
GET    /api/resume/:id/data      # Get parsed data
```

### Matching

```
POST   /api/matching/score       # Get match score
GET    /api/matching/:id         # Get match explanation
POST   /api/matching/batch       # Batch matching
```

### Analytics

```
GET    /api/analytics/dashboard  # Dashboard data
GET    /api/analytics/pipeline   # Pipeline metrics
GET    /api/analytics/sources    # Source performance
GET    /api/analytics/diversity  # Diversity metrics
```

## Troubleshooting Checklist

### System Performance Issues

- [ ] Clear browser cache and cookies
- [ ] Try different browser or incognito mode
- [ ] Check internet connection speed
- [ ] Disable browser extensions temporarily
- [ ] Restart browser
- [ ] Contact support if issues persist

### Login Issues

- [ ] Verify username and password
- [ ] Check caps lock status
- [ ] Try password reset
- [ ] Clear browser cache
- [ ] Check for account lockout
- [ ] Contact administrator

### Resume Upload Issues

- [ ] Check file format (PDF, DOCX preferred)
- [ ] Verify file size (under 10MB)
- [ ] Ensure file is not corrupted
- [ ] Try different file
- [ ] Check internet connection
- [ ] Contact support for persistent issues

### Email Issues

- [ ] Verify recipient email address
- [ ] Check spam/junk folder
- [ ] Verify email service configuration
- [ ] Test with different email address
- [ ] Check email template formatting
- [ ] Contact support for delivery issues

### Matching Issues

- [ ] Ensure candidate profile is complete
- [ ] Verify job requirements are defined
- [ ] Check for missing skills data
- [ ] Refresh candidate profile
- [ ] Re-run matching process
- [ ] Contact support for algorithm issues

### Integration Issues

- [ ] Verify API credentials
- [ ] Check integration status
- [ ] Test connection manually
- [ ] Review error logs
- [ ] Check service provider status
- [ ] Contact integration support

### Data Issues

- [ ] Verify data format and completeness
- [ ] Check for duplicate entries
- [ ] Validate required fields
- [ ] Review data import logs
- [ ] Check user permissions
- [ ] Contact support for data corruption

## Quick Tips

### Efficiency Tips

- Use keyboard shortcuts for faster navigation
- Set up email templates for common communications
- Use bulk operations for multiple candidates
- Create saved searches for frequent queries
- Set up automated workflows for routine tasks

### Best Practices

- Keep candidate profiles complete and up-to-date
- Use consistent requirement categorization (MUST/SHOULD/NICE)
- Provide detailed feedback in candidate notes
- Regularly review and optimize job templates
- Monitor analytics to identify improvement opportunities

### Time-Saving Features

- Drag-and-drop pipeline management
- Quick actions from candidate cards
- Bulk email and messaging
- Automated status updates
- Smart search and filtering

This quick reference guide provides immediate access to the most commonly needed information for efficient use of the AI-Native ATS system.
