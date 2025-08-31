"use client";

import * as React from "react";
import {
  useApplicationsQuery,
  useBulkUpdateApplicationsMutation,
  type ApplicationFilters,
  type PipelineStage,
} from "@/hooks/api/use-applications-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { KanbanBoard } from "./kanban-board";
import { cn } from "@/lib/utils";

interface ApplicationPipelineProps {
  filters: ApplicationFilters;
}

const PIPELINE_STAGES: {
  key: PipelineStage;
  label: string;
  color: string;
  description: string;
}[] = [
  {
    key: "applied",
    label: "Applied",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "New applications",
  },
  {
    key: "screening",
    label: "Screening",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    description: "Initial review",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Qualified candidates",
  },
  {
    key: "interview_scheduled",
    label: "Interview Scheduled",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Interview planned",
  },
  {
    key: "interview_completed",
    label: "Interview Completed",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Awaiting decision",
  },
  {
    key: "offer_extended",
    label: "Offer Extended",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Offer sent",
  },
  {
    key: "offer_accepted",
    label: "Offer Accepted",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Offer accepted",
  },
  {
    key: "hired",
    label: "Hired",
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Successfully hired",
  },
];

const REJECTED_STAGE = {
  key: "rejected" as PipelineStage,
  label: "Rejected",
  color: "bg-red-100 text-red-800 border-red-200",
  description: "Not proceeding",
};

export function ApplicationPipeline({ filters }: ApplicationPipelineProps) {
  const { toast } = useToast();
  const [selectedApplications, setSelectedApplications] = React.useState<
    string[]
  >([]);

  const { data, isLoading, error, refetch } = useApplicationsQuery(filters);
  const bulkUpdateMutation = useBulkUpdateApplicationsMutation();

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplications((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleBulkMove = async (stage: PipelineStage) => {
    if (selectedApplications.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        applicationIds: selectedApplications,
        status: stage,
      });

      toast({
        title: "Applications moved",
        description: `${selectedApplications.length} application(s) moved to ${PIPELINE_STAGES.find((s) => s.key === stage)?.label || stage}`,
      });

      setSelectedApplications([]);
    } catch (error) {
      toast({
        title: "Failed to move applications",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleApplicationUpdate = () => {
    refetch();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>Failed to load applications. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allStages = [...PIPELINE_STAGES, REJECTED_STAGE];

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedApplications.length} application(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkMove("shortlisted")}
                >
                  Move to Shortlisted
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkMove("rejected")}
                >
                  Reject Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplications([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <KanbanBoard
        applications={data?.applications || []}
        onApplicationUpdate={handleApplicationUpdate}
      />

      {/* Pipeline Summary */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {[...PIPELINE_STAGES, REJECTED_STAGE].map((stage) => {
                const count = data.statusCounts?.[stage.key] || 0;
                const percentage =
                  data.total > 0 ? Math.round((count / data.total) * 100) : 0;

                return (
                  <div key={stage.key} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {stage.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
