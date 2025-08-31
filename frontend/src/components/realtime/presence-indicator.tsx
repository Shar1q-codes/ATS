"use client";

import { Users, Eye } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface PresenceIndicatorProps {
  viewers: Array<{
    userId: string;
    name: string;
    joinedAt: Date;
  }>;
  className?: string;
}

export function PresenceIndicator({
  viewers,
  className,
}: PresenceIndicatorProps) {
  if (viewers.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4 text-gray-500" />
          <Badge variant="secondary" className="text-xs">
            {viewers.length}
          </Badge>
        </div>

        <div className="flex -space-x-2">
          {viewers.slice(0, 3).map((viewer) => (
            <Tooltip key={viewer.userId}>
              <TooltipTrigger>
                <Avatar className="h-6 w-6 border-2 border-white">
                  <AvatarFallback className="text-xs">
                    {getInitials(viewer.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{viewer.name}</p>
                <p className="text-xs text-gray-500">
                  Viewing since {new Date(viewer.joinedAt).toLocaleTimeString()}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {viewers.length > 3 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{viewers.length - 3}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {viewers.slice(3).map((viewer) => (
                    <p key={viewer.userId} className="text-sm">
                      {viewer.name}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
