"use client";

import React from "react";
import {
  type CompanyJobVariant,
  useCompanyProfileQuery,
  useJobTemplateQuery,
} from "@/hooks/api/use-jobs-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import {
  Building,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface JobVariantPreviewProps {
  jobVariant: CompanyJobVariant;
}

export function JobVariantPreview({ jobVariant }: JobVariantPreviewProps) {
  const { data: companyProfile } = useCompanyProfileQuery(
    jobVariant.companyProfileId
  );
  const { data: jobTemplate } = useJobTemplateQuery(jobVariant.jobTemplateId);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "must":
        return "destructive";
      case "should":
        return "warning";
      case "nice":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "skill":
        return "info";
      case "experience":
        return "success";
      case "education":
        return "warning";
      case "certification":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">
            {jobVariant.customTitle || jobTemplate?.name || "Job Variant"}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {companyProfile?.name || "Loading..."}
            </div>
            <div className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Based on: {jobTemplate?.name || "Loading..."}
            </div>
            <div className="flex items-center gap-1">
              {jobVariant.isActive ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              {jobVariant.isActive ? "Active" : "Inactive"}
            </div>
          </div>
          <div className="mt-2">
            <Badge variant={jobVariant.isActive ? "success" : "secondary"}>
              {jobVariant.isActive ? "Active" : "Inactive"}
            </Badge>
            {jobVariant.publishedAt && (
              <Badge variant="success" className="ml-2">
                Published {formatDateTime(jobVariant.publishedAt)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Custom Description */}
      {jobVariant.customDescription && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {jobVariant.customDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Company Context */}
      {companyProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Company Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Industry</h4>
                  <p className="text-sm text-muted-foreground">
                    {companyProfile.industry}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Size</h4>
                  <Badge variant="outline">{companyProfile.size}</Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Work Arrangement</h4>
                  <Badge variant="outline">
                    {companyProfile.workArrangement}
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Location</h4>
                <p className="text-sm text-muted-foreground">
                  {companyProfile.location}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Context */}
      {jobTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Base Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Level</h4>
                  <Badge variant="outline">{jobTemplate.level}</Badge>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Experience Range</h4>
                  <p className="text-sm text-muted-foreground">
                    {jobTemplate.experienceRange.min}-
                    {jobTemplate.experienceRange.max} years
                  </p>
                </div>
              </div>
              {jobTemplate.salaryRange && (
                <div>
                  <h4 className="font-medium mb-2">Salary Range</h4>
                  <p className="text-sm text-muted-foreground">
                    {jobTemplate.salaryRange.currency}{" "}
                    {jobTemplate.salaryRange.min.toLocaleString()}-
                    {jobTemplate.salaryRange.max.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Requirements */}
      {jobVariant.additionalRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Additional Requirements (
              {jobVariant.additionalRequirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobVariant.additionalRequirements.map((requirement, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(requirement.type) as any}>
                          {requirement.type}
                        </Badge>
                        <Badge
                          variant={
                            getCategoryColor(requirement.category) as any
                          }
                        >
                          {requirement.category.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          Weight: {requirement.weight}/10
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm">{requirement.description}</p>

                    {requirement.alternatives &&
                      requirement.alternatives.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Alternatives:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {requirement.alternatives.map(
                              (alternative, altIndex) => (
                                <Badge
                                  key={altIndex}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {alternative}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modified Requirements */}
      {jobVariant.modifiedRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Modified Requirements ({jobVariant.modifiedRequirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobVariant.modifiedRequirements.map((requirement, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getTypeColor(requirement.type) as any}>
                          {requirement.type}
                        </Badge>
                        <Badge
                          variant={
                            getCategoryColor(requirement.category) as any
                          }
                        >
                          {requirement.category.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          Weight: {requirement.weight}/10
                        </Badge>
                        <Badge variant="warning">Modified</Badge>
                      </div>
                    </div>

                    <p className="text-sm">{requirement.description}</p>

                    {requirement.alternatives &&
                      requirement.alternatives.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Alternatives:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {requirement.alternatives.map(
                              (alternative, altIndex) => (
                                <Badge
                                  key={altIndex}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {alternative}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {jobVariant.additionalRequirements.length}
              </div>
              <div className="text-sm text-muted-foreground">Additional</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {jobVariant.modifiedRequirements.length}
              </div>
              <div className="text-sm text-muted-foreground">Modified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {
                  [
                    ...jobVariant.additionalRequirements,
                    ...jobVariant.modifiedRequirements,
                  ].filter((r) => r.category === "must").length
                }
              </div>
              <div className="text-sm text-muted-foreground">Must Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {jobVariant.isActive ? "Active" : "Inactive"}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Variant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Created: {formatDateTime(jobVariant.createdAt)}</div>
            <div>Last Updated: {formatDateTime(jobVariant.updatedAt)}</div>
            {jobVariant.publishedAt && (
              <div>Published: {formatDateTime(jobVariant.publishedAt)}</div>
            )}
            <div>Variant ID: {jobVariant.id}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
