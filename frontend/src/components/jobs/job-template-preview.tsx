"use client";

import React from "react";
import { type JobTemplate } from "@/hooks/api/use-jobs-api";
import { useJobFamilyQuery } from "@/hooks/api/use-jobs-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, capitalizeFirst } from "@/lib/utils";

interface JobTemplatePreviewProps {
  jobTemplate: JobTemplate;
}

export function JobTemplatePreview({ jobTemplate }: JobTemplatePreviewProps) {
  const { data: jobFamily } = useJobFamilyQuery(jobTemplate.jobFamilyId);

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

  const getLevelColor = (level: string) => {
    switch (level) {
      case "junior":
        return "secondary";
      case "mid":
        return "info";
      case "senior":
        return "warning";
      case "lead":
        return "success";
      case "principal":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold">{jobTemplate.name}</h2>
          <Badge variant={getLevelColor(jobTemplate.level) as any}>
            {capitalizeFirst(jobTemplate.level)}
          </Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          Job Family: {jobFamily?.name || "Loading..."}
        </p>
        <div className="text-sm text-muted-foreground">
          Created: {formatDateTime(jobTemplate.createdAt)} | Updated:{" "}
          {formatDateTime(jobTemplate.updatedAt)}
        </div>
      </div>

      {/* Experience and Salary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Experience Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobTemplate.experienceRange.min}-
              {jobTemplate.experienceRange.max} years
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary Range</CardTitle>
          </CardHeader>
          <CardContent>
            {jobTemplate.salaryRange ? (
              <div className="text-2xl font-bold">
                {jobTemplate.salaryRange.currency}{" "}
                {jobTemplate.salaryRange.min.toLocaleString()}-
                {jobTemplate.salaryRange.max.toLocaleString()}
              </div>
            ) : (
              <div className="text-muted-foreground">Not specified</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Base Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>
            Base Requirements ({jobTemplate.baseRequirements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobTemplate.baseRequirements.map((requirement, index) => (
              <Card key={requirement.id || index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getTypeColor(requirement.type) as any}>
                        {requirement.type}
                      </Badge>
                      <Badge
                        variant={getCategoryColor(requirement.category) as any}
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

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {
                  jobTemplate.baseRequirements.filter(
                    (r) => r.category === "must"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Must Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  jobTemplate.baseRequirements.filter(
                    (r) => r.category === "should"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Should Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  jobTemplate.baseRequirements.filter(
                    (r) => r.category === "nice"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Nice to Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {jobTemplate.baseRequirements.reduce(
                  (sum, req) => sum + req.weight,
                  0
                )}
              </div>
              <div className="text-sm text-muted-foreground">Total Weight</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Family Context */}
      {jobFamily && (
        <Card>
          <CardHeader>
            <CardTitle>Job Family Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">{jobFamily.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {jobFamily.description}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Skill Categories:</p>
                <div className="flex flex-wrap gap-1">
                  {jobFamily.skillCategories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="text-xs"
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
