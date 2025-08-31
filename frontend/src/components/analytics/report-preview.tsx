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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Calendar, User, Eye, X } from "lucide-react";
import {
  useReportQuery,
  useExportReportMutation,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { RecruitmentMetricsChart } from "./recruitment-metrics-chart";
import { PipelineMetricsChart } from "./pipeline-metrics-chart";
import { SourcePerformanceChart } from "./source-performance-chart";
import { DiversityMetricsChart } from "./diversity-metrics-chart";

interface ReportPreviewProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportPreview({
  reportId,
  isOpen,
  onClose,
}: ReportPreviewProps) {
  const { data: report, isLoading } = useReportQuery(reportId, isOpen);
  const exportMutation = useExportReportMutation();

  const handleExport = async (format: "csv" | "pdf" | "xlsx") => {
    try {
      const result = await exportMutation.mutateAsync({
        reportId,
        format,
      });

      // Create download link
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${report?.name || "report"}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "recruitment":
        return "bg-blue-100 text-blue-800";
      case "pipeline":
        return "bg-green-100 text-green-800";
      case "diversity":
        return "bg-purple-100 text-purple-800";
      case "performance":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderReportContent = () => {
    if (!report?.data) return null;

    switch (report.type) {
      case "recruitment":
        return <RecruitmentMetricsChart data={report.data} />;
      case "pipeline":
        return (
          <PipelineMetricsChart
            pipelineData={report.data.pipeline}
            timeToFillData={report.data.timeToFill}
          />
        );
      case "diversity":
        return <DiversityMetricsChart data={report.data} />;
      case "performance":
        return (
          <SourcePerformanceChart
            sourceData={report.data.sources}
            candidateSourceData={report.data.candidateSources}
          />
        );
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Report content preview not available for this report type.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <DialogTitle className="text-xl">
                  {report?.name || "Report Preview"}
                </DialogTitle>
                <DialogDescription>
                  {report && (
                    <div className="flex items-center gap-4 mt-1">
                      <Badge className={getReportTypeColor(report.type)}>
                        {report.type}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.generatedAt)}
                      </span>
                      <span className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {report.generatedBy}
                      </span>
                    </div>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <LoadingSpinner className="h-4 w-4 mr-1" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={exportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : report ? (
            <>
              {/* Report Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Parameters</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {report.parameters.dateRange && (
                          <p>
                            Date Range:{" "}
                            {new Date(
                              report.parameters.dateRange.start
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              report.parameters.dateRange.end
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {report.parameters.jobId && (
                          <p>Job Filter: {report.parameters.jobId}</p>
                        )}
                        <p>
                          Include Charts:{" "}
                          {report.parameters.includeCharts ? "Yes" : "No"}
                        </p>
                        <p>
                          Include Raw Data:{" "}
                          {report.parameters.includeRawData ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Generation Details</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Generated: {formatDate(report.generatedAt)}</p>
                        <p>Generated by: {report.generatedBy}</p>
                        <p>Report ID: {report.id}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Report Content */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Report Content</h3>
                {renderReportContent()}
              </div>

              {/* Raw Data Preview */}
              {report.parameters.includeRawData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Raw Data Preview</CardTitle>
                    <CardDescription>
                      First few rows of the raw data included in this report
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(report.data, null, 2).substring(0, 500)}
                        {JSON.stringify(report.data, null, 2).length > 500 &&
                          "..."}
                      </pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Export the full report to access all raw data
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Report not found or failed to load.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
