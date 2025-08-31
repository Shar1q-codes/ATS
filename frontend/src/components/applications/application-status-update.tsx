"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateApplicationStatusMutation,
  type Application,
  type PipelineStage,
} from "@/hooks/api/use-applications-api";
import { Edit, ArrowRight } from "lucide-react";

interface ApplicationStatusUpdateProps {
  application: Application;
}

const PIPELINE_STAGES: {
  value: PipelineStage;
  label: string;
  description: string;
}[] = [
  {
    value: "applied",
    label: "Applied",
    description: "Initial application received",
  },
  {
    value: "screening",
    label: "Screening",
    description: "Initial review in progress",
  },
  {
    value: "shortlisted",
    label: "Shortlisted",
    description: "Candidate meets basic requirements",
  },
  {
    value: "interview_scheduled",
    label: "Interview Scheduled",
    description: "Interview has been arranged",
  },
  {
    value: "interview_completed",
    label: "Interview Completed",
    description: "Interview finished, awaiting decision",
  },
  {
    value: "offer_extended",
    label: "Offer Extended",
    description: "Job offer has been sent",
  },
  {
    value: "offer_accepted",
    label: "Offer Accepted",
    description: "Candidate accepted the offer",
  },
  {
    value: "hired",
    label: "Hired",
    description: "Candidate has been successfully hired",
  },
  {
    value: "rejected",
    label: "Rejected",
    description: "Application was not successful",
  },
];

export function ApplicationStatusUpdate({
  application,
}: ApplicationStatusUpdateProps) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<PipelineStage>(
    application.status
  );
  const [notes, setNotes] = React.useState("");

  const updateStatusMutation = useUpdateApplicationStatusMutation();

  const handleStatusUpdate = async () => {
    if (selectedStatus === application.status && !notes.trim()) {
      setOpen(false);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: application.id,
        status: selectedStatus,
        notes: notes.trim() || undefined,
      });

      toast({
        title: "Status updated",
        description: `Application moved to ${PIPELINE_STAGES.find((s) => s.value === selectedStatus)?.label}`,
      });

      setOpen(false);
      setNotes("");
    } catch (error) {
      toast({
        title: "Failed to update status",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const currentStage = PIPELINE_STAGES.find(
    (s) => s.value === application.status
  );
  const selectedStage = PIPELINE_STAGES.find((s) => s.value === selectedStatus);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Application Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{currentStage?.label}</div>
              <div className="text-sm text-muted-foreground">
                {currentStage?.description}
              </div>
            </div>
          </div>

          {/* New Status */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(value as PipelineStage)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    <div>
                      <div className="font-medium">{stage.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {stage.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Change Preview */}
          {selectedStatus !== application.status && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{currentStage?.label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <span className="font-medium text-blue-600">
                  {selectedStage?.label}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a note about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
