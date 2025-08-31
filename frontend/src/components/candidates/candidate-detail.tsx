"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  Download,
  Send,
  Briefcase,
  GraduationCap,
  Award,
  User,
} from "lucide-react";
import { type Candidate } from "@/hooks/api/use-candidates-api";
import { formatDistanceToNow, format } from "date-fns";

interface CandidateDetailProps {
  candidate: Candidate;
}

export function CandidateDetail({ candidate }: CandidateDetailProps) {
  const { parsedData } = candidate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {candidate.email}
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {candidate.phone}
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {candidate.location}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {candidate.resumeUrl && (
            <Button variant="outline" asChild>
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Resume
              </a>
            </Button>
          )}
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData?.totalExperience || 0}
            </div>
            <p className="text-xs text-muted-foreground">Years Experience</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData?.skills?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Skills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData?.education?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Education</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {parsedData?.certifications?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Certifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <p>
                    {candidate.firstName} {candidate.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p>{candidate.email}</p>
                </div>
                {candidate.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p>{candidate.phone}</p>
                  </div>
                )}
                {candidate.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Location
                    </label>
                    <p>{candidate.location}</p>
                  </div>
                )}
                {candidate.linkedinUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      LinkedIn
                    </label>
                    <a
                      href={candidate.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View Profile
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {candidate.portfolioUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Portfolio
                    </label>
                    <a
                      href={candidate.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View Portfolio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Added
                  </label>
                  <p>
                    {formatDistanceToNow(new Date(candidate.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {parsedData?.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.map((skill) => (
                      <Badge key={skill.name} variant="secondary">
                        {skill.name}
                        {skill.yearsOfExperience && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({skill.yearsOfExperience}y)
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No skills information available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          {parsedData?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{parsedData.summary}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData?.experience?.length ? (
                <div className="space-y-6">
                  {parsedData.experience.map((exp, index) => (
                    <div key={index} className="border-l-2 border-muted pl-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{exp.position}</h3>
                          <p className="text-muted-foreground">{exp.company}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(exp.startDate), "MMM yyyy")} -{" "}
                          {exp.endDate
                            ? format(new Date(exp.endDate), "MMM yyyy")
                            : "Present"}
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          {exp.description}
                        </p>
                      )}
                      {exp.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exp.skills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No work experience information available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parsedData?.education?.length ? (
                  <div className="space-y-4">
                    {parsedData.education.map((edu, index) => (
                      <div key={index} className="space-y-1">
                        <h3 className="font-semibold">{edu.degree}</h3>
                        <p className="text-muted-foreground">
                          {edu.institution}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {edu.field}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(edu.startDate), "yyyy")} -{" "}
                          {edu.endDate
                            ? format(new Date(edu.endDate), "yyyy")
                            : "Present"}
                        </p>
                        {edu.gpa && (
                          <p className="text-sm text-muted-foreground">
                            GPA: {edu.gpa}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No education information available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parsedData?.certifications?.length ? (
                  <div className="space-y-4">
                    {parsedData.certifications.map((cert, index) => (
                      <div key={index} className="space-y-1">
                        <h3 className="font-semibold">{cert.name}</h3>
                        <p className="text-muted-foreground">{cert.issuer}</p>
                        <p className="text-sm text-muted-foreground">
                          Issued: {format(new Date(cert.issueDate), "MMM yyyy")}
                        </p>
                        {cert.expiryDate && (
                          <p className="text-sm text-muted-foreground">
                            Expires:{" "}
                            {format(new Date(cert.expiryDate), "MMM yyyy")}
                          </p>
                        )}
                        {cert.credentialId && (
                          <p className="text-sm text-muted-foreground">
                            ID: {cert.credentialId}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No certifications available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Application history will be displayed here once the application
                management system is implemented.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
