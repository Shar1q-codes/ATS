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
import { Download, RefreshCw } from "lucide-react";
import {
  usePipelineMetricsQuery,
  useTimeToFillMetricsQuery,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  DateRangePicker,
  DateRange,
} from "@/components/analytics/date-range-picker";
import { PipelineMetricsChart } from "@/components/analytics/pipeline-metrics-chart";

export default function PipelineMetricsPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedJob, setSelectedJob] = React.useState<string>("");

  const {
    data: pipelineMetrics,
    isLoading: isPipelineLoading,
    refetch: refetchPipeline,
  } = usePipelineMetricsQuery(dateRange, selectedJob);
  const {
    data: timeToFillMetrics,
    isLoading: isTimeToFillLoading,
    refetch: refetchTimeToFill,
  } = useTimeToFillMetricsQuery(dateRange, selectedJob);

  const isLoading = isPipelineLoading || isTimeToFillLoading;

  const handleRefresh = () => {
    refetchPipeline();
    refetchTimeToFill();
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
            Pipeline Metrics
          </h1>
          <p className="text-muted-foreground">
            Analyze your recruitment pipeline performance and identify
            bottlenecks
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
      ) : pipelineMetrics ? (
        <PipelineMetricsChart
          pipelineData={pipelineMetrics}
          timeToFillData={timeToFillMetrics}
        />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              No pipeline data available for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
