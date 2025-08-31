"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import {
  useRecruitmentMetricsQuery,
  useDashboardDataQuery,
  useRealTimeMetricsQuery,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import {
  DateRangePicker,
  DateRange,
} from "@/components/analytics/date-range-picker";
import { RecruitmentMetricsChart } from "@/components/analytics/recruitment-metrics-chart";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0], // 30 days ago
    end: new Date().toISOString().split("T")[0], // today
  });

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refetch: refetchDashboard,
  } = useDashboardDataQuery(dateRange);
  const {
    data: recruitmentMetrics,
    isLoading: isMetricsLoading,
    refetch: refetchMetrics,
  } = useRecruitmentMetricsQuery(dateRange);
  const { data: realTimeMetrics, isLoading: isRealTimeLoading } =
    useRealTimeMetricsQuery(true);

  const isLoading = isDashboardLoading || isMetricsLoading;

  const handleRefresh = () => {
    refetchDashboard();
    refetchMetrics();
  };

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your recruitment performance and identify optimization
            opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recruitmentMetrics?.totalApplications || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recruitmentMetrics?.totalCandidates || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +8% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Fit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recruitmentMetrics?.averageFitScore
                  ? `${recruitmentMetrics.averageFitScore.toFixed(1)}%`
                  : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                +2.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Time to Fill
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recruitmentMetrics?.averageTimeToFill
                  ? `${recruitmentMetrics.averageTimeToFill} days`
                  : "0 days"}
              </div>
              <p className="text-xs text-muted-foreground">
                -3 days from last month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="diversity">Diversity</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {recruitmentMetrics && (
            <RecruitmentMetricsChart data={recruitmentMetrics} />
          )}
        </TabsContent>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Analytics</CardTitle>
              <CardDescription>
                Detailed pipeline metrics and bottleneck analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Visit the{" "}
                  <a
                    href="/analytics/pipeline"
                    className="text-primary hover:underline"
                  >
                    Pipeline Metrics
                  </a>{" "}
                  page for detailed analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Source Performance</CardTitle>
              <CardDescription>
                Candidate source tracking and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Visit the{" "}
                  <a
                    href="/analytics/sources"
                    className="text-primary hover:underline"
                  >
                    Source Performance
                  </a>{" "}
                  page for detailed analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diversity">
          <Card>
            <CardHeader>
              <CardTitle>Diversity & Bias Detection</CardTitle>
              <CardDescription>
                Diversity metrics and bias detection indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Visit the{" "}
                  <a
                    href="/analytics/diversity"
                    className="text-primary hover:underline"
                  >
                    Diversity Reports
                  </a>{" "}
                  page for detailed analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Report Management</CardTitle>
              <CardDescription>
                Generate, manage, and share analytics reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Visit the{" "}
                  <a
                    href="/analytics/reports"
                    className="text-primary hover:underline"
                  >
                    Reports
                  </a>{" "}
                  page to manage your reports
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
