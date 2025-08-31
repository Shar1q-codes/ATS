"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Copy,
  Trash2,
  Edit,
  Download,
  Share2,
  Calendar,
  User,
} from "lucide-react";
import {
  useDeleteReportMutation,
  useDuplicateReportMutation,
  useExportReportMutation,
  ReportData,
} from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { ReportSharingDialog } from "./report-sharing-dialog";

interface ReportManagementDialogProps {
  report: ReportData | null;
  isOpen: boolean;
  onClose: () => void;
  onReportUpdated: () => void;
}

export function ReportManagementDialog({
  report,
  isOpen,
  onClose,
  onReportUpdated,
}: ReportManagementDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSharingDialogOpen, setIsSharingDialogOpen] = React.useState(false);
  const [duplicateName, setDuplicateName] = React.useState("");

  const deleteReportMutation = useDeleteReportMutation();
  const duplicateReportMutation = useDuplicateReportMutation();
  const exportReportMutation = useExportReportMutation();
  const { toast } = useToast();

  const handleDeleteReport = async () => {
    if (!report) return;

    try {
      await deleteReportMutation.mutateAsync(report.id);
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      onClose();
      onReportUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateReport = async () => {
    if (!report) return;

    try {
      await duplicateReportMutation.mutateAsync({
        reportId: report.id,
        name: duplicateName || `${report.name} (Copy)`,
      });
      toast({
        title: "Success",
        description: "Report duplicated successfully",
      });
      setDuplicateName("");
      onClose();
      onReportUpdated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate report",
        variant: "destructive",
      });
    }
  };

  const handleExportReport = async (format: "csv" | "pdf" | "xlsx") => {
    if (!report) return;

    try {
      const result = await exportReportMutation.mutateAsync({
        reportId: report.id,
        format,
      });

      // Create download link
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = `${report.name}.${format}`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  React.useEffect(() => {
    if (report && isOpen) {
      setDuplicateName(`${report.name} (Copy)`);
    }
  }, [report, isOpen]);

  if (!report) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Report
            </DialogTitle>
            <DialogDescription>
              Manage settings and actions for "{report.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Report Information */}
            <div className="space-y-3">
              <h4 className="font-medium">Report Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{report.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{report.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(report.generatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created by:</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {report.generatedBy}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-medium">Actions</h4>

              {/* Share Report */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsSharingDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Report
              </Button>

              {/* Export Options */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport("csv")}
                  disabled={exportReportMutation.isPending}
                >
                  {exportReportMutation.isPending ? (
                    <LoadingSpinner className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport("pdf")}
                  disabled={exportReportMutation.isPending}
                >
                  {exportReportMutation.isPending ? (
                    <LoadingSpinner className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport("xlsx")}
                  disabled={exportReportMutation.isPending}
                >
                  {exportReportMutation.isPending ? (
                    <LoadingSpinner className="h-3 w-3" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  Excel
                </Button>
              </div>

              {/* Duplicate Report */}
              <div className="space-y-2">
                <Label htmlFor="duplicate-name">Duplicate Report</Label>
                <div className="flex gap-2">
                  <Input
                    id="duplicate-name"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder="Enter new report name"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDuplicateReport}
                    disabled={
                      duplicateReportMutation.isPending || !duplicateName.trim()
                    }
                  >
                    {duplicateReportMutation.isPending ? (
                      <LoadingSpinner className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Report
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReportMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Sharing Dialog */}
      <ReportSharingDialog
        reportId={report.id}
        reportName={report.name}
        isOpen={isSharingDialogOpen}
        onClose={() => setIsSharingDialogOpen(false)}
      />
    </>
  );
}
