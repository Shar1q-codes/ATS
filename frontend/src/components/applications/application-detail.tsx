"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  Download,
  Send,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Briefcase,
} from "lucide-react";
import { type Application } from "@/hooks/api/use-applications-api";
import { ApplicationNotes } from "./application-notes";
import { ApplicationStageHistory } from "./application-stage-history";
import { ApplicationStatusUpdate } from "./application-status-update";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ApplicationDetailProps {
  application: Application;
}

export function ApplicationDetail({ application }: ApplicationDetailProps) {
  const { candidate, job, matchExplanation, fitScore } = application;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "screening":
        return "bg-yellow-100 text-yellow-800";
      case "shortlisted":
        return "bg-purple-100 text-purple-800";
      case "interview_scheduled":
        return "bg-orange-100 text-orange-800";
      case "interview_completed":
        return "bg-indigo-100 text-indigo-800";
      case "offer_extended":
        return "bg-green-100 text-green-800";
      case "offer_accepted":
        return "bg-emerald-100 text-emerald-800";
      case "hired":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {candidate?.firstName} {candidate?.lastName}
            </h1>
            <Badge className={getStatusColor(application.status)}>
              {application.status
                .replace("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">
            {job?.title} at {job?.company}
          </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Applied{" "}
              {formatDistanceToNow(new Date(application.appliedAt), {
                addSuffix: true,
              })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated{" "}
              {formatDistanceToNow(new Date(application.lastUpdated), {
                addSuffix: true,
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ApplicationStatusUpdate application={application} />
          <Button variant="outline" asChild>
            <Link href={`/candidates/${candidate?.id}`}>
              <User className="mr-2 h-4 w-4" />
              View Candidate
            </Link>
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Fit Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {getScoreIcon(fitScore)}
              <div className="text-2xl font-bold">{fitScore}%</div>
            </div>
            <p className="text-xs text-muted-foreground">Overall Fit Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {matchExplanation?.breakdown?.mustHaveScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Must-Have Requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {matchExplanation?.breakdown?.shouldHaveScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Should-Have Requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {matchExplanation?.breakdown?.niceToHaveScore || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Nice-to-Have Requirements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="match-analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="match-analysis">Match Analysis</TabsTrigger>
          <TabsTrigger value="candidate-info">Candidate Info</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="match-analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchExplanation?.strengths?.length ? (
                  <ul className="space-y-2">
                    {matchExplanation.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No strengths identified
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchExplanation?.gaps?.length ? (
                  <ul className="space-y-2">
                    {matchExplanation.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{gap}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No gaps identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          {matchExplanation?.detailedAnalysis?.length && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Requirement Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matchExplanation.detailedAnalysis.map((analysis, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {analysis.requirement.description}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {analysis.requirement.category.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Weight: {analysis.requirement.weight}/10
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {analysis.matched ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="text-sm font-medium">
                            {Math.round(analysis.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {analysis.explanation}
                      </p>
                      {analysis.evidence?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Evidence:
                          </p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {analysis.evidence.map(
                              (evidence, evidenceIndex) => (
                                <li
                                  key={evidenceIndex}
                                  className="flex items-start gap-1"
                                >
                                  <span>•</span>
                                  <span>{evidence}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {matchExplanation?.recommendations?.length && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {matchExplanation.recommendations.map(
                    (recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="candidate-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Candidate information will be displayed here.</p>
                <Button asChild className="mt-4">
                  <Link href={`/candidates/${candidate?.id}`}>
                    View Full Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <ApplicationNotes applicationId={application.id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ApplicationStageHistory application={application} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
