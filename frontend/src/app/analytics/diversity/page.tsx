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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, RefreshCw, AlertTriangle } from "lucide-react";
import { useDiversityMetricsQuery } from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  DateRangePicker,
  DateRange,
} from "@/components/analytics/date-range-picker";
import { DiversityMetricsChart } from "@/components/analytics/diversity-metrics-chart";

export default function DiversityReportsPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedJob, setSelectedJob] = React.useState<string>("");

  const {
    data: diversityMetrics,
    isLoading,
    refetch,
  } = useDiversityMetricsQuery(dateRange, selectedJob);

  const handleRefresh = () => {
    refetch();
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
            Diversity & Bias Reports
          </h1>
          <p className="text-muted-foreground">
            Monitor diversity metrics and detect potential bias in your
            recruitment process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Jobs</SelectItem>
              <SelectItem value="job-1">Senior Software Engineer</SelectItem>
              <SelectItem value="job-2">Product Manager</SelectItem>
              <SelectItem value="job-3">UX Designer</SelectItem>
            </SelectContent>
          </Select>
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
      ) : diversityMetrics ? (
        <div className="space-y-6">
          {/* Bias Indicators Alert */}
          {diversityMetrics.biasIndicators?.some(
            (indicator) => indicator.status === "critical"
          ) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Bias Indicators Detected</AlertTitle>
              <AlertDescription>
                Some metrics indicate potential bias in your recruitment
                process. Review the bias indicators below for details.
              </AlertDescription>
            </Alert>
          )}

          {diversityMetrics.biasIndicators?.some(
            (indicator) => indicator.status === "warning"
          ) &&
            !diversityMetrics.biasIndicators?.some(
              (indicator) => indicator.status === "critical"
            ) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Bias Warnings Detected</AlertTitle>
                <AlertDescription>
                  Some metrics show potential areas for improvement in diversity
                  and inclusion.
                </AlertDescription>
              </Alert>
            )}

          {/* Charts */}
          <DiversityMetricsChart data={diversityMetrics} />

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Diversity & Inclusion Recommendations</CardTitle>
              <CardDescription>
                Actionable insights to improve diversity in your recruitment
                process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Expand Source Diversity
                  </h3>
                  <p className="text-sm text-blue-800">
                    Consider partnering with diverse professional organizations
                    and universities to expand your candidate pool.
                  </p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">
                    Review Job Descriptions
                  </h3>
                  <p className="text-sm text-green-800">
                    Analyze job descriptions for potentially biased language
                    that might discourage diverse candidates from applying.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">
                    Structured Interview Process
                  </h3>
                  <p className="text-sm text-purple-800">
                    Implement structured interviews with standardized questions
                    to reduce unconscious bias in evaluation.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h3 className="font-medium text-orange-900 mb-2">
                    Regular Bias Training
                  </h3>
                  <p className="text-sm text-orange-800">
                    Provide regular unconscious bias training for all team
                    members involved in the recruitment process.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              No diversity data available for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
