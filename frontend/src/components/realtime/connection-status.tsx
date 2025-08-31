"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { useRealtime } from "../../hooks/use-realtime";

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
}

export function ConnectionStatus({
  className,
  showText = false,
}: ConnectionStatusProps) {
  const { connectionState, error } = useRealtime();

  const getStatusConfig = () => {
    switch (connectionState) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Connected",
          variant: "default" as const,
          color: "text-green-600",
        };
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "Connecting",
          variant: "secondary" as const,
          color: "text-yellow-600",
        };
      case "disconnected":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: error ? "Connection Error" : "Disconnected",
          variant: "destructive" as const,
          color: "text-red-600",
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Unknown",
          variant: "secondary" as const,
          color: "text-gray-600",
        };
    }
  };

  const config = getStatusConfig();

  if (showText) {
    return (
      <Badge
        variant={config.variant}
        className={`${className} ${config.color}`}
      >
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>
    );
  }

  return (
    <div className={`${className} ${config.color}`} title={config.text}>
      {config.icon}
    </div>
  );
}
