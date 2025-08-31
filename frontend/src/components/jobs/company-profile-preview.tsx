"use client";

import React from "react";
import { type CompanyProfile } from "@/hooks/api/use-jobs-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, capitalizeFirst } from "@/lib/utils";
import { Building, MapPin, Users, Briefcase } from "lucide-react";

interface CompanyProfilePreviewProps {
  companyProfile: CompanyProfile;
}

export function CompanyProfilePreview({
  companyProfile,
}: CompanyProfilePreviewProps) {
  const getSizeColor = (size: string) => {
    switch (size) {
      case "startup":
        return "info";
      case "small":
        return "secondary";
      case "medium":
        return "warning";
      case "large":
        return "success";
      case "enterprise":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getWorkArrangementColor = (arrangement: string) => {
    switch (arrangement) {
      case "remote":
        return "info";
      case "hybrid":
        return "warning";
      case "onsite":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getSizeDescription = (size: string) => {
    switch (size) {
      case "startup":
        return "1-10 employees";
      case "small":
        return "11-50 employees";
      case "medium":
        return "51-200 employees";
      case "large":
        return "201-1000 employees";
      case "enterprise":
        return "1000+ employees";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Building className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{companyProfile.name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {companyProfile.industry}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {capitalizeFirst(companyProfile.size)} (
              {getSizeDescription(companyProfile.size)})
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {companyProfile.location}
            </div>
          </div>
          <div className="mt-2">
            <Badge
              variant={
                getWorkArrangementColor(companyProfile.workArrangement) as any
              }
            >
              {capitalizeFirst(companyProfile.workArrangement)} Work
            </Badge>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Company Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={getSizeColor(companyProfile.size) as any}>
                {capitalizeFirst(companyProfile.size)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {getSizeDescription(companyProfile.size)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Arrangement</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                getWorkArrangementColor(companyProfile.workArrangement) as any
              }
            >
              {capitalizeFirst(companyProfile.workArrangement)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Company Culture */}
      <Card>
        <CardHeader>
          <CardTitle>Company Culture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {companyProfile.culture.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits & Perks */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits & Perks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {companyProfile.benefits.map((benefit) => (
              <Badge key={benefit} variant="outline">
                {benefit}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hiring Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Priority Skills */}
          <div>
            <h4 className="font-medium mb-3 text-destructive">
              Priority Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {companyProfile.preferences.prioritySkills.length > 0 ? (
                companyProfile.preferences.prioritySkills.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No priority skills defined
                </span>
              )}
            </div>
          </div>

          {/* Deal Breakers */}
          <div>
            <h4 className="font-medium mb-3 text-destructive">Deal Breakers</h4>
            <div className="flex flex-wrap gap-2">
              {companyProfile.preferences.dealBreakers.length > 0 ? (
                companyProfile.preferences.dealBreakers.map((dealBreaker) => (
                  <Badge key={dealBreaker} variant="destructive">
                    {dealBreaker}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No deal breakers defined
                </span>
              )}
            </div>
          </div>

          {/* Nice to Have */}
          <div>
            <h4 className="font-medium mb-3 text-green-600">Nice to Have</h4>
            <div className="flex flex-wrap gap-2">
              {companyProfile.preferences.niceToHave.length > 0 ? (
                companyProfile.preferences.niceToHave.map((item) => (
                  <Badge key={item} variant="success">
                    {item}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No nice-to-have items defined
                </span>
              )}
            </div>
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
              <div className="text-2xl font-bold text-primary">
                {companyProfile.culture.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Culture Values
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {companyProfile.benefits.length}
              </div>
              <div className="text-sm text-muted-foreground">Benefits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {companyProfile.preferences.prioritySkills.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Priority Skills
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {companyProfile.preferences.niceToHave.length}
              </div>
              <div className="text-sm text-muted-foreground">Nice to Have</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Created: {formatDateTime(companyProfile.createdAt)}</div>
            <div>Last Updated: {formatDateTime(companyProfile.updatedAt)}</div>
            <div>Profile ID: {companyProfile.id}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
