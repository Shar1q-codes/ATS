"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  Users,
  Target,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  useSourcePerformanceQuery,
  useCandidateSourceMetricsQuery,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  DateRangePicker,
  DateRange,
} from "@/components/analytics/date-range-picker";
import { SourcePerformanceChart } from "@/components/analytics/source-performance-chart";

export default function SourcePerformancePage() {
  const [dateRange, setDateRange] = React.useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const {
    data: sourcePerformance,
    isLoading: isSourceLoading,
    refetch: refetchSource,
  } = useSourcePerformanceQuery(dateRange);
  const {
    data: candidateSourceMetrics,
    isLoading: isCandidateSourceLoading,
    refetch: refetchCandidateSource,
  } = useCandidateSourceMetricsQuery(dateRange);

  const isLoading = isSourceLoading || isCandidateSourceLoading;

  const handleRefresh = () => {
    refetchSource();
    refetchCandidateSource();
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
            Source Performance
          </h1>
          <p className="text-muted-foreground">
            Track and analyze candidate source effectiveness and ROI
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Candidates
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sourcePerformance?.totalCandidates || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  From all sources
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applications
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sourcePerformance?.totalApplications || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all positions
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Hired
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sourcePerformance?.totalHired || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successful placements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Overall Conversion
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {sourcePerformance?.totalApplications &&
                  sourcePerformance?.totalHired
                    ? (
                        (sourcePerformance.totalHired /
                          sourcePerformance.totalApplications) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">
                  Application to hire rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {sourcePerformance && (
            <SourcePerformanceChart
              sourceData={sourcePerformance}
              candidateSourceData={candidateSourceMetrics}
            />
          )}
        </div>
      )}
    </div>
  );
}
