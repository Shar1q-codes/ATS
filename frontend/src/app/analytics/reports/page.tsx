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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Eye,
  Share2,
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  useReportsQuery,
  useExportReportMutation,
  ReportData,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { ReportPreview } from "@/components/analytics/report-preview";
import { ReportSharingDialog } from "@/components/analytics/report-sharing-dialog";
import { ReportManagementDialog } from "@/components/analytics/report-management-dialog";
import { ReportGenerator } from "@/components/analytics/report-generator";

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("date");
  const [previewReportId, setPreviewReportId] = React.useState<string>("");
  const [sharingReport, setSharingReport] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [managementReport, setManagementReport] =
    React.useState<ReportData | null>(null);
  const [showGenerator, setShowGenerator] = React.useState(false);

  const {
    data: reports,
    isLoading,
    refetch: refetchReports,
  } = useReportsQuery(typeFilter === "all" ? undefined : typeFilter, 50);
  const exportReportMutation = useExportReportMutation();
  const { toast } = useToast();

  const handleExportReport = async (
    reportId: string,
    format: "csv" | "pdf" | "xlsx",
    reportName: string
  ) => {
    try {
      const result = await exportReportMutation.mutateAsync({
        reportId,
        format,
      });

      // Create download link
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${reportName}.${format}`;
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

  const filteredReports = React.useMemo(() => {
    if (!reports) return [];

    let filtered = reports.filter((report) => {
      const matchesSearch = report.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      return matchesSearch && matchesType;
    });

    // Sort reports
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "type":
          return a.type.localeCompare(b.type);
        case "date":
        default:
          return (
            new Date(b.generatedAt).getTime() -
            new Date(a.generatedAt).getTime()
          );
      }
    });

    return filtered;
  }, [reports, searchQuery, typeFilter, sortBy]);

  if (showGenerator) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowGenerator(false)}
            className="mb-4"
          >
            ← Back to Reports
          </Button>
        </div>
        <ReportGenerator />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Manage and export your analytics reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="recruitment">Recruitment</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="diversity">Diversity</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>
            {filteredReports.length} report
            {filteredReports.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{report.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getReportTypeColor(report.type)}>
                          {report.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(report.generatedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3" />
                          {report.generatedBy}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewReportId(report.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSharingReport({
                                id: report.id,
                                name: report.name,
                              })
                            }
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Select
                            onValueChange={(format: "csv" | "pdf" | "xlsx") =>
                              handleExportReport(report.id, format, report.name)
                            }
                          >
                            <SelectTrigger className="w-8 h-8 p-0 border-0">
                              <Download className="h-4 w-4" />
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Generate your first report to get started"}
              </p>
              <Button onClick={() => setShowGenerator(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Preview Dialog */}
      <ReportPreview
        reportId={previewReportId}
        isOpen={!!previewReportId}
        onClose={() => setPreviewReportId("")}
      />

      {/* Report Sharing Dialog */}
      {sharingReport && (
        <ReportSharingDialog
          reportId={sharingReport.id}
          reportName={sharingReport.name}
          isOpen={!!sharingReport}
          onClose={() => setSharingReport(null)}
        />
      )}

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
