"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Loading } from "../ui/loading";
import { useOrganizationStats } from "../../hooks/api/use-organizations-api";
import { useDashboardDataQuery } from "../../hooks/api/use-analytics-api";

interface OrganizationAnalyticsProps {
  organizationId: string;
}

export function OrganizationAnalytics({
  organizationId,
}: OrganizationAnalyticsProps) {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useOrganizationStats(organizationId);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useDashboardDataQuery();

  if (statsLoading || analyticsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Loading />
        </CardContent>
      </Card>
    );
  }

  if (statsError || analyticsError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load analytics data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Overview</CardTitle>
          <CardDescription>
            Key metrics and statistics for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>
              <p className="text-2xl font-bold">{stats?.userCount || 0}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Active Jobs
              </p>
              <p className="text-2xl font-bold">{analytics?.totalJobs || 0}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Candidates
              </p>
              <p className="text-2xl font-bold">
                {analytics?.totalCandidates || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recruitment Performance</CardTitle>
          <CardDescription>
            Performance metrics for your recruitment activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Average Time to Fill
                </p>
                <p className="text-xl font-semibold">
                  {analytics?.averageTimeToFill
                    ? `${analytics.averageTimeToFill} days`
                    : "N/A"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Application Conversion Rate
                </p>
                <p className="text-xl font-semibold">
                  {analytics?.conversionRate
                    ? `${(analytics.conversionRate * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Applications
                </p>
                <p className="text-xl font-semibold">
                  {analytics?.activeApplications || 0}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Successful Hires
                </p>
                <p className="text-xl font-semibold">
                  {analytics?.successfulHires || 0}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Health</CardTitle>
          <CardDescription>
            Current status of your recruitment pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.pipelineStages &&
              Object.entries(analytics.pipelineStages).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {stage
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}

            {(!analytics?.pipelineStages ||
              Object.keys(analytics.pipelineStages).length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                No pipeline data available yet. Start by creating jobs and
                receiving applications.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common organization management tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Export organization data</li>
                <li>• Generate compliance reports</li>
                <li>• Backup user data</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">System Health</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• API usage statistics</li>
                <li>• Storage utilization</li>
                <li>• Performance metrics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
