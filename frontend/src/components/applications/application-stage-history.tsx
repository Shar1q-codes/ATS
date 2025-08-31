"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Application } from "@/hooks/api/use-applications-api";
import {
  Clock,
  User,
  Bot,
  ArrowRight,
  CheckCircle,
  History,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ApplicationStageHistoryProps {
  application: Application;
}

export function ApplicationStageHistory({
  application,
}: ApplicationStageHistoryProps) {
  const { stageHistory } = application;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "screening":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "shortlisted":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "interview_scheduled":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "interview_completed":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "offer_extended":
        return "bg-green-100 text-green-800 border-green-200";
      case "offer_accepted":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "hired":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStageLabel = (stage: string) => {
    return stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!stageHistory?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Stage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="mx-auto h-12 w-12 mb-4" />
            <p>No stage history available</p>
            <p className="text-sm">
              Stage changes will appear here as the application progresses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort history by date (most recent first)
  const sortedHistory = [...stageHistory].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Stage History ({stageHistory.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedHistory.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline line */}
              {index < sortedHistory.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
              )}

              <div className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  {entry.automated ? (
                    <Bot className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.fromStage && (
                      <>
                        <Badge className={getStatusColor(entry.fromStage)}>
                          {formatStageLabel(entry.fromStage)}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={getStatusColor(entry.toStage)}>
                      {formatStageLabel(entry.toStage)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(
                        new Date(entry.changedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(entry.changedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {entry.automated ? (
                      <span className="text-muted-foreground">
                        Automatically moved by system
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Moved by {entry.changedByUser?.firstName}{" "}
                        {entry.changedByUser?.lastName}
                      </span>
                    )}
                  </div>

                  {entry.notes && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm leading-relaxed">{entry.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
