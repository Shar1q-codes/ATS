# ATS – Product & Execution Planner

## 1. Vision
Build an **AI-native Applicant Tracking System** that:
- Handles **per-company role variations** without duplicating job posts.
- Offers **explainable AI matching** with transparent fit scores.
- Is **CRM-ready** for future expansion.
- Reduces recruiter workload while improving candidate experience.

---

## 2. Target Market
- **Primary**: SMBs, startups (<100 employees), recruitment agencies.
- **Secondary**: Mid-market companies, niche verticals (healthcare, tech).

---

## 3. Core Differentiators
1. **Per-Company Role Variation Model**
2. **Explainable AI Fit Scoring**
3. **Variant-Aware Analytics**
4. **Bias-Proof Matching (constraint freezing)**
5. **Candidate Nurturing AI**

---

## 4. Feature Requirements (MVP)

### 4.1 AI Resume Parsing
- Accepts PDF, DOCX, scans, LinkedIn URLs.
- Extracts skills, experience, education, certifications, portfolio.
- Contextual skill detection.

### 4.2 Job Matching
- MUST/SHOULD/NICE constraint model.
- Semantic skill similarity using embeddings.
- Fit score + human-readable explanation.

### 4.3 Job Posting Variations
- Canonical JobFamily → JobTemplate → CompanyProfile → CompanyJobVariant.
- ResolvedSpec for matching & publishing.
- Version history for auditability.

### 4.4 Pipeline Management
- Kanban stages: Applied → Shortlist → Interview → Offer → Hired.
- Stage history + notes.

### 4.5 Communication
- Email API integration (Postmark/SendGrid).
- Merge fields for personalization.

### 4.6 Candidate Experience
- Mobile-friendly apply flow.
- Resume auto-fill.
- Status tracking.

---

## 5. Technical Stack
**Frontend**: Next.js, TailwindCSS, ShadCN/UI  
**Backend**: Node.js (NestJS/Express), PostgreSQL (Supabase)  
**AI Layer**: GPT-4o, GPT-4o Mini, text-embedding-3-large  
**Storage**: AWS S3 / Supabase Storage  
**Integrations**: Email API, job boards, calendars

---

## 6. Compliance
- GDPR, CCPA, Indian PDP compliance.
- Consent tracking & data deletion support.
- Role-based access control.
- Full recruiter action audit logs.

---

## 7. Analytics & Reporting
- Time-to-fill
- Source performance
- Candidate drop-off rates
- Diversity metrics

---

## 8. Cost Estimate (API-Based AI)
- **One-time setup**: ₹90,000–₹1,65,000
- **Monthly**: ₹12,400 – ₹44,700
- **First-year total**: ₹2.38 lakh – ₹7.01 lakh

---

## 9. Development Timeline (MVP)

### Week 1–2
- Setup repo, hosting, database, CI/CD.
- Build job posting variation model backend.
- Create basic API endpoints.

### Week 3–4
- Integrate AI resume parser.
- Build candidate intake + deduplication.
- Basic matching engine with explanations.

### Week 5–6
- Pipeline management UI.
- Email integration.
- Public job page.

### Week 7
- Compliance layer (RBAC, audit logs).
- Minimal analytics dashboard.
- Prepare beta testing environment.

---

## 10. Beta Program Plan
- Recruit 10–20 SMB recruiters/agencies.
- Provide free access for 2 months in exchange for feedback.
- Weekly check-ins for bug reports & suggestions.
- Track KPIs during beta:
  - Time-to-shortlist
  - Recruiter satisfaction score
  - Candidate satisfaction score

---

## 11. Launch & Pricing Strategy
**Phase 1** – Closed Beta (Free)  
**Phase 2** – Public Beta (₹2,500/month per recruiter OR ₹800/job slot)  
**Phase 3** – Full Launch with tiered pricing

---

## 12. Success Metrics
- ≥ 80% reduction in time-to-shortlist.
- ≥ 90% recruiter satisfaction.
- ≥ 95% pipeline stage data completeness.
- Positive candidate feedback (>4/5).

---

## 13. Expansion Path to CRM
1. Convert candidate DB → contact DB.
2. Add client/project pipelines alongside hiring pipelines.
3. Integrate sales, marketing, support automation.

---

## 14. Next Steps
- Finalize privacy policy & terms.
- Prepare UI wireframes.
- Lock in beta testers list.
- Start Week 1 development.

