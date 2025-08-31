"use client";

import { useBackendStatus } from "@/hooks/use-backend-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Server,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

export function BackendStatus() {
  const {
    status,
    metrics,
    isLoading,
    error,
    checkStatus,
    ensureBackendRunning,
  } = useBackendStatus();

  const getStatusColor = (healthy: boolean, running: boolean) => {
    if (!running) return "destructive";
    if (!healthy) return "secondary";
    return "default";
  };

  const getStatusText = (healthy: boolean, running: boolean) => {
    if (!running) return "Offline";
    if (!healthy) return "Degraded";
    return "Healthy";
  };

  const getStatusIcon = (healthy: boolean, running: boolean) => {
    if (!running) return <AlertTriangle className="h-4 w-4" />;
    if (!healthy) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Backend Service Status
            </CardTitle>
            <CardDescription>
              Last checked: {status.lastCheck.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(status.healthy, status.running)}>
              {getStatusIcon(status.healthy, status.running)}
              {getStatusText(status.healthy, status.running)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={checkStatus}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!status.running && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Backend service is not running. Click below to attempt startup.
              </p>
              <Button onClick={ensureBackendRunning} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Backend...
                  </>
                ) : (
                  "Start Backend"
                )}
              </Button>
            </div>
          )}

          {status.details && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Environment:</span>{" "}
                  {status.details.environment}
                </div>
                <div>
                  <span className="font-medium">Version:</span>{" "}
                  {status.details.version}
                </div>
                <div>
                  <span className="font-medium">Uptime:</span>{" "}
                  {Math.floor(status.details.uptime / 60)}m
                </div>
                <div>
                  <span className="font-medium">Memory:</span>{" "}
                  {Math.round(status.details.memory.used / 1024 / 1024)}MB
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Service Health Overview
            </CardTitle>
            <CardDescription>
              {metrics.overview.healthyServices} of{" "}
              {metrics.overview.totalServices} services healthy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">
                      {service.name}
                    </span>
                    {service.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={
                      service.status === "healthy"
                        ? "default"
                        : service.status === "degraded"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
