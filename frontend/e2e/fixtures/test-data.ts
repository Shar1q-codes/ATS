export const testUsers = {
  admin: {
    email: "admin@test.com",
    password: "testpassword123",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  },
  recruiter: {
    email: "recruiter@test.com",
    password: "testpassword123",
    firstName: "Recruiter",
    lastName: "User",
    role: "recruiter",
  },
  hiringManager: {
    email: "hiring-manager@test.com",
    password: "testpassword123",
    firstName: "Hiring",
    lastName: "Manager",
    role: "hiring_manager",
  },
};

export const testCandidates = [
  {
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    phone: "+1-555-0101",
    location: "San Francisco, CA",
    linkedinUrl: "https://linkedin.com/in/johndoe",
    portfolioUrl: "https://johndoe.dev",
    skills: ["JavaScript", "React", "Node.js", "TypeScript"],
    experience: 5,
  },
  {
    email: "jane.smith@example.com",
    firstName: "Jane",
    lastName: "Smith",
    phone: "+1-555-0102",
    location: "New York, NY",
    linkedinUrl: "https://linkedin.com/in/janesmith",
    portfolioUrl: "https://janesmith.com",
    skills: ["Python", "Django", "PostgreSQL", "AWS"],
    experience: 7,
  },
  {
    email: "mike.johnson@example.com",
    firstName: "Mike",
    lastName: "Johnson",
    phone: "+1-555-0103",
    location: "Austin, TX",
    linkedinUrl: "https://linkedin.com/in/mikejohnson",
    skills: ["Java", "Spring Boot", "Microservices", "Docker"],
    experience: 3,
  },
];

export const testJobFamilies = [
  {
    name: "Software Engineer",
    description: "Software development roles across all levels",
    skillCategories: ["Programming", "Frameworks", "Databases", "DevOps"],
    requirements: [
      {
        type: "skill",
        category: "must",
        description: "Proficiency in at least one programming language",
        weight: 9,
      },
      {
        type: "experience",
        category: "must",
        description: "Minimum 2 years of software development experience",
        weight: 8,
      },
      {
        type: "skill",
        category: "should",
        description: "Experience with modern web frameworks",
        weight: 7,
      },
    ],
  },
  {
    name: "Product Manager",
    description: "Product management and strategy roles",
    skillCategories: ["Strategy", "Analytics", "Communication", "Leadership"],
    requirements: [
      {
        type: "experience",
        category: "must",
        description: "Product management experience",
        weight: 9,
      },
      {
        type: "skill",
        category: "must",
        description: "Strong analytical and communication skills",
        weight: 8,
      },
    ],
  },
];

export const testCompanyProfiles = [
  {
    name: "TechCorp Inc.",
    industry: "Technology",
    size: "medium",
    culture: ["Innovation", "Collaboration", "Growth"],
    benefits: ["Health Insurance", "401k", "Remote Work"],
    workArrangement: "hybrid",
    location: "San Francisco, CA",
    preferences: {
      prioritySkills: ["React", "TypeScript", "AWS"],
      dealBreakers: ["No remote work experience"],
      niceToHave: ["Startup experience", "Open source contributions"],
    },
  },
  {
    name: "StartupXYZ",
    industry: "Fintech",
    size: "startup",
    culture: ["Fast-paced", "Ownership", "Innovation"],
    benefits: ["Equity", "Flexible Hours", "Learning Budget"],
    workArrangement: "remote",
    location: "Remote",
    preferences: {
      prioritySkills: ["Python", "Machine Learning", "APIs"],
      dealBreakers: ["No startup experience"],
      niceToHave: ["Fintech experience", "Leadership skills"],
    },
  },
];

export const testApplicationStages = [
  "applied",
  "screening",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "offer_extended",
  "offer_accepted",
  "hired",
  "rejected",
];

export const testEmailTemplates = [
  {
    name: "Application Received",
    subject: "Thank you for your application - {{jobTitle}}",
    body: "Dear {{candidateName}},\n\nThank you for applying to the {{jobTitle}} position at {{companyName}}. We have received your application and will review it shortly.\n\nBest regards,\nThe Hiring Team",
  },
  {
    name: "Interview Invitation",
    subject: "Interview Invitation - {{jobTitle}} at {{companyName}}",
    body: "Dear {{candidateName}},\n\nWe are pleased to invite you for an interview for the {{jobTitle}} position. Please reply with your availability.\n\nBest regards,\n{{recruiterName}}",
  },
];
