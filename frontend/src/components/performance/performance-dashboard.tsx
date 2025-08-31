"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceMonitor } from "@/lib/performance-monitor";
import { useBundleAnalysis } from "@/lib/bundle-analyzer";
import { useServiceWorker } from "@/lib/service-worker";
import { Activity, Zap, Globe, Package, Wifi, WifiOff } from "lucide-react";

export function PerformanceDashboard() {
  const { getMetrics, getOverallScore, sendMetrics } = usePerformanceMonitor();
  const { stats, analyze, getRecommendations, formatSize, isLoading } =
    useBundleAnalysis();
  const { isOnline, updateAvailable, updateApp, clearCache } =
    useServiceWorker();

  const [metrics, setMetrics] = React.useState(getMetrics());
  const [overallScore, setOverallScore] = React.useState(getOverallScore());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getMetrics());
      setOverallScore(getOverallScore());
    }, 5000);

    return () => clearInterval(interval);
  }, [getMetrics, getOverallScore]);

  const latestMetrics = metrics[metrics.length - 1];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Poor";
  };

  const formatMetric = (value: number | undefined, unit: string) => {
    if (value === undefined) return "N/A";
    return `${Math.round(value)}${unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-600">
            Monitor and optimize application performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="text-green-600">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}

          {updateAvailable && (
            <Button onClick={updateApp} size="sm">
              Update Available
            </Button>
          )}
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Score
          </CardTitle>
          <CardDescription>
            Overall performance based on Core Web Vitals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={`text-4xl font-bold ${getScoreColor(overallScore)}`}
            >
              {overallScore}
            </div>
            <Badge
              variant={
                overallScore >= 90
                  ? "default"
                  : overallScore >= 50
                    ? "secondary"
                    : "destructive"
              }
            >
              {getScoreBadge(overallScore)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Core Web Vitals */}
        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Largest Contentful Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.lcp, "ms")}
                </div>
                <p className="text-xs text-gray-600">Good: &lt;2.5s</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">First Input Delay</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.fid, "ms")}
                </div>
                <p className="text-xs text-gray-600">Good: &lt;100ms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Cumulative Layout Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestMetrics?.cls ? latestMetrics.cls.toFixed(3) : "N/A"}
                </div>
                <p className="text-xs text-gray-600">Good: &lt;0.1</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Time to First Byte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.ttfb, "ms")}
                </div>
                <p className="text-xs text-gray-600">Good: &lt;800ms</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Page Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.pageLoadTime, "ms")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">API Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.apiResponseTime, "ms")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Render Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(latestMetrics?.renderTime, "ms")}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bundle Analysis */}
        <TabsContent value="bundle" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Bundle Analysis</h3>
            <Button onClick={analyze} disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Analyze Bundle"}
            </Button>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Total Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatSize(stats.totalSize)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Gzipped Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatSize(stats.gzippedSize)}
                  </div>
                  <p className="text-xs text-gray-600">
                    {((1 - stats.gzippedSize / stats.totalSize) * 100).toFixed(
                      1
                    )}
                    % compression
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.assets.length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getRecommendations().map((rec, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                  {getRecommendations().length === 0 && (
                    <p className="text-sm text-gray-600">
                      No recommendations at this time.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Network */}
        <TabsContent value="network" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Offline</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {isOnline
                    ? "All features available"
                    : "Limited functionality - cached data only"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Worker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Active</span>
                  </div>
                  {updateAvailable && (
                    <Badge variant="outline" className="text-blue-600">
                      Update Available
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
                <CardDescription>
                  Clear cached data to free up space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => clearCache()} variant="outline">
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Send performance data for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => sendMetrics("/api/analytics/performance")}
                  variant="outline"
                >
                  Send Metrics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
