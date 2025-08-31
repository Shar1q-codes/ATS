"use client";

import React from "react";
import { type JobFamily } from "@/hooks/api/use-jobs-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface JobFamilyPreviewProps {
  jobFamily: JobFamily;
}

export function JobFamilyPreview({ jobFamily }: JobFamilyPreviewProps) {
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
      {/* Basic Information */}
      <div>
        <h2 className="text-2xl font-bold mb-2">{jobFamily.name}</h2>
        <p className="text-muted-foreground mb-4">{jobFamily.description}</p>
        <div className="text-sm text-muted-foreground">
          Created: {formatDateTime(jobFamily.createdAt)} | Updated:{" "}
          {formatDateTime(jobFamily.updatedAt)}
        </div>
      </div>

      {/* Skill Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {jobFamily.skillCategories.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Base Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>
            Base Requirements ({jobFamily.baseRequirements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobFamily.baseRequirements.map((requirement, index) => (
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
                  jobFamily.baseRequirements.filter(
                    (r) => r.category === "must"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Must Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  jobFamily.baseRequirements.filter(
                    (r) => r.category === "should"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Should Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  jobFamily.baseRequirements.filter(
                    (r) => r.category === "nice"
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Nice to Have</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {jobFamily.skillCategories.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Skill Categories
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
