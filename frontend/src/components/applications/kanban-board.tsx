"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  KeyboardSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useUpdateApplicationStatusMutation,
  type Application,
  type PipelineStage,
} from "@/hooks/api/use-applications-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  Calendar,
  Star,
  GripVertical,
  User,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  applications: Application[];
  onApplicationUpdate?: () => void;
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

interface ApplicationCardProps {
  application: Application;
  isDragging?: boolean;
}

function ApplicationCard({
  application,
  isDragging = false,
}: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: application.id,
    data: {
      type: "application",
      application,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200",
        (isDragging || isSortableDragging) &&
          "opacity-50 rotate-2 scale-105 shadow-lg",
        "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Move application for ${application.candidate?.firstName} ${application.candidate?.lastName}`}
    >
      <div className="space-y-2">
        {/* Drag Handle */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/applications/${application.id}`}
              className="font-medium text-sm hover:underline block truncate"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {application.candidate?.firstName}{" "}
              {application.candidate?.lastName}
            </Link>
            <p className="text-xs text-muted-foreground truncate">
              {application.job?.title}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              asChild
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Link href={`/applications/${application.id}`}>
                <Eye className="h-3 w-3" />
                <span className="sr-only">View application details</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Fit Score */}
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500" />
          <span
            className={cn(
              "text-xs font-medium",
              getFitScoreColor(application.fitScore)
            )}
          >
            {application.fitScore}% match
          </span>
        </div>

        {/* Applied Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDistanceToNow(new Date(application.appliedAt), {
            addSuffix: true,
          })}
        </div>

        {/* Notes Count */}
        {application.notes && application.notes.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{application.notes.length} note(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  stage: (typeof PIPELINE_STAGES)[0] | typeof REJECTED_STAGE;
  applications: Application[];
  isOver?: boolean;
}

function KanbanColumn({
  stage,
  applications,
  isOver = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isSortableOver } = useSortable({
    id: stage.key,
    data: {
      type: "column",
      stage: stage.key,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "min-h-[600px] transition-all duration-200",
        (isOver || isSortableOver) &&
          "ring-2 ring-primary ring-offset-2 bg-primary/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {applications.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{stage.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext
          items={applications.map((app) => app.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
            {applications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No applications</p>
                <p className="text-xs">Drag applications here</p>
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({
  applications,
  onApplicationUpdate,
}: KanbanBoardProps) {
  const { toast } = useToast();
  const [activeApplication, setActiveApplication] =
    React.useState<Application | null>(null);
  const [optimisticApplications, setOptimisticApplications] =
    React.useState<Application[]>(applications);

  const updateStatusMutation = useUpdateApplicationStatusMutation();

  // Update optimistic state when applications prop changes
  React.useEffect(() => {
    setOptimisticApplications(applications);
  }, [applications]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const allStages = [...PIPELINE_STAGES, REJECTED_STAGE];

  const getApplicationsByStage = (stage: PipelineStage) => {
    return optimisticApplications.filter((app) => app.status === stage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const application = optimisticApplications.find(
      (app) => app.id === active.id
    );
    if (application) {
      setActiveApplication(application);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the active application
    const activeApplication = optimisticApplications.find(
      (app) => app.id === activeId
    );
    if (!activeApplication) return;

    // Determine the target stage
    let targetStage: PipelineStage;

    if (
      typeof overId === "string" &&
      allStages.some((stage) => stage.key === overId)
    ) {
      // Dropped on a column
      targetStage = overId as PipelineStage;
    } else {
      // Dropped on another application, find its stage
      const targetApplication = optimisticApplications.find(
        (app) => app.id === overId
      );
      if (!targetApplication) return;
      targetStage = targetApplication.status;
    }

    // Don't do anything if dropping on the same stage
    if (activeApplication.status === targetStage) return;

    // Optimistically update the application status
    setOptimisticApplications((prev) =>
      prev.map((app) =>
        app.id === activeId ? { ...app, status: targetStage } : app
      )
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveApplication(null);

    if (!over) {
      // Revert optimistic update if dropped outside
      setOptimisticApplications(applications);
      return;
    }

    const activeId = active.id;
    const activeApplication = applications.find((app) => app.id === activeId);

    if (!activeApplication) return;

    // Determine the target stage
    let targetStage: PipelineStage;

    if (
      typeof over.id === "string" &&
      allStages.some((stage) => stage.key === over.id)
    ) {
      // Dropped on a column
      targetStage = over.id as PipelineStage;
    } else {
      // Dropped on another application, find its stage
      const targetApplication = optimisticApplications.find(
        (app) => app.id === over.id
      );
      if (!targetApplication) {
        setOptimisticApplications(applications);
        return;
      }
      targetStage = targetApplication.status;
    }

    // Don't do anything if dropping on the same stage
    if (activeApplication.status === targetStage) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: activeApplication.id,
        status: targetStage,
      });

      toast({
        title: "Application moved",
        description: `${activeApplication.candidate?.firstName} ${activeApplication.candidate?.lastName} moved to ${allStages.find((s) => s.key === targetStage)?.label || targetStage}`,
      });

      onApplicationUpdate?.();
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticApplications(applications);

      toast({
        title: "Failed to move application",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: {
          onDragStart({ active }) {
            const application = optimisticApplications.find(
              (app) => app.id === active.id
            );
            return `Picked up application for ${application?.candidate?.firstName} ${application?.candidate?.lastName}`;
          },
          onDragOver({ active, over }) {
            if (!over) return;

            const application = optimisticApplications.find(
              (app) => app.id === active.id
            );
            const targetStage = allStages.find(
              (stage) => stage.key === over.id
            );

            if (targetStage) {
              return `Application for ${application?.candidate?.firstName} ${application?.candidate?.lastName} is over ${targetStage.label} column`;
            }

            return `Application is being moved`;
          },
          onDragEnd({ active, over }) {
            if (!over) return `Application was dropped`;

            const application = optimisticApplications.find(
              (app) => app.id === active.id
            );
            const targetStage = allStages.find(
              (stage) => stage.key === over.id
            );

            if (targetStage) {
              return `Application for ${application?.candidate?.firstName} ${application?.candidate?.lastName} was moved to ${targetStage.label}`;
            }

            return `Application was moved`;
          },
        },
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <SortableContext
          items={allStages.map((stage) => stage.key)}
          strategy={verticalListSortingStrategy}
        >
          {allStages.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              applications={getApplicationsByStage(stage.key)}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeApplication ? (
          <ApplicationCard application={activeApplication} isDragging={true} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
