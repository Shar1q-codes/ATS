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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Calendar,
  Settings,
  Eye,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import {
  useGenerateReportMutation,
  useExportReportMutation,
  useReportsQuery,
  ReportData,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { DateRangePicker, DateRange } from "./date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { ReportPreview } from "./report-preview";
import { ReportSharingDialog } from "./report-sharing-dialog";
import { ReportManagementDialog } from "./report-management-dialog";

interface ReportGeneratorProps {
  className?: string;
}

export function ReportGenerator({ className }: ReportGeneratorProps) {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = React.useState(false);
  const [previewReportId, setPreviewReportId] = React.useState<string>("");
  const [sharingReportId, setSharingReportId] = React.useState<string>("");
  const [sharingReportName, setSharingReportName] = React.useState<string>("");
  const [managementReport, setManagementReport] =
    React.useState<ReportData | null>(null);
  const [reportName, setReportName] = React.useState("");
  const [reportType, setReportType] = React.useState<
    "recruitment" | "pipeline" | "diversity" | "performance"
  >("recruitment");
  const [reportDescription, setReportDescription] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedJob, setSelectedJob] = React.useState<string>("all");

  const {
    data: reports,
    isLoading: isReportsLoading,
    refetch: refetchReports,
  } = useReportsQuery();
  const generateReportMutation = useGenerateReportMutation();
  const exportReportMutation = useExportReportMutation();
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!reportName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report name",
        variant: "destructive",
      });
      return;
    }

    try {
      const parameters = {
        dateRange,
        jobId: selectedJob && selectedJob !== "all" ? selectedJob : undefined,
        includeCharts: true,
        includeRawData: true,
      };

      await generateReportMutation.mutateAsync({
        name: reportName,
        type: reportType,
        parameters,
        format: "json",
      });

      toast({
        title: "Success",
        description: "Report generated successfully",
      });

      setIsGenerateDialogOpen(false);
      setReportName("");
      setReportDescription("");
      refetchReports();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const handleExportReport = async (
    reportId: string,
    format: "csv" | "pdf" | "xlsx"
  ) => {
    try {
      const result = await exportReportMutation.mutateAsync({
        reportId,
        format,
      });

      // Create download link
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `report.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Report Generator
            </h2>
            <p className="text-muted-foreground">
              Generate and export custom analytics reports
            </p>
          </div>
          <Dialog
            open={isGenerateDialogOpen}
            onOpenChange={setIsGenerateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>
                  Create a custom analytics report with your specified
                  parameters
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="col-span-3"
                    placeholder="Monthly Recruitment Report"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={reportType}
                    onValueChange={(value: unknown) => setReportType(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recruitment">
                        Recruitment Metrics
                      </SelectItem>
                      <SelectItem value="pipeline">
                        Pipeline Analysis
                      </SelectItem>
                      <SelectItem value="diversity">
                        Diversity Report
                      </SelectItem>
                      <SelectItem value="performance">
                        Performance Analysis
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="job" className="text-right">
                    Job Filter
                  </Label>
                  <Select value={selectedJob} onValueChange={setSelectedJob}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      <SelectItem value="job-1">
                        Senior Software Engineer
                      </SelectItem>
                      <SelectItem value="job-2">Product Manager</SelectItem>
                      <SelectItem value="job-3">UX Designer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Date Range</Label>
                  <div className="col-span-3">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="col-span-3"
                    placeholder="Optional description for this report..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending}
                >
                  {generateReportMutation.isPending && (
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                  )}
                  Generate Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>
              View and export your previously generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isReportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{report.name}</h3>
                        <Badge className={getReportTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(report.generatedAt)}
                        </span>
                        <span>by {report.generatedBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewReportId(report.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSharingReportId(report.id);
                          setSharingReportName(report.name);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                      <Select
                        onValueChange={(format: "csv" | "pdf" | "xlsx") =>
                          handleExportReport(report.id, format)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <Download className="h-4 w-4 mr-1" />
                          <SelectValue placeholder="Export" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">Export CSV</SelectItem>
                          <SelectItem value="pdf">Export PDF</SelectItem>
                          <SelectItem value="xlsx">Export Excel</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagementReport(report)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No reports generated yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Click "Generate Report" to create your first report
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Export Options
            </CardTitle>
            <CardDescription>
              Export current dashboard data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-20 flex-col">
                <Download className="h-6 w-6 mb-2" />
                <span>Export CSV</span>
                <span className="text-xs text-muted-foreground">Raw data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span>Export PDF</span>
                <span className="text-xs text-muted-foreground">
                  Formatted report
                </span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Download className="h-6 w-6 mb-2" />
                <span>Export Excel</span>
                <span className="text-xs text-muted-foreground">
                  Spreadsheet
                </span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Share2 className="h-6 w-6 mb-2" />
                <span>Share Link</span>
                <span className="text-xs text-muted-foreground">
                  Public view
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview Dialog */}
      <ReportPreview
        reportId={previewReportId}
        isOpen={!!previewReportId}
        onClose={() => setPreviewReportId("")}
      />

      {/* Report Sharing Dialog */}
      <ReportSharingDialog
        reportId={sharingReportId}
        reportName={sharingReportName}
        isOpen={!!sharingReportId}
        onClose={() => {
          setSharingReportId("");
          setSharingReportName("");
        }}
      />

      {/* Report Management Dialog */}
      <ReportManagementDialog
        report={managementReport}
        isOpen={!!managementReport}
        onClose={() => setManagementReport(null)}
        onReportUpdated={refetchReports}
      />
    </div>
  );
}
