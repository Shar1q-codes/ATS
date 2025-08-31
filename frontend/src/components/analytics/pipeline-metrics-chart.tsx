"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import {
  PipelineMetrics,
  TimeToFillMetrics,
} from "@/hooks/api/use-analytics-api";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

interface PipelineMetricsChartProps {
  pipelineData: PipelineMetrics;
  timeToFillData?: TimeToFillMetrics;
  className?: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
];

export function PipelineMetricsChart({
  pipelineData,
  timeToFillData,
  className,
}: PipelineMetricsChartProps) {
  // Prepare stage distribution data for pie chart
  const stageDistributionData = Object.entries(
    pipelineData.stageDistribution
  ).map(([stage, count], index) => ({
    name: stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  // Prepare conversion rates data
  const conversionData = Object.entries(pipelineData.stageConversionRates).map(
    ([stage, rate]) => ({
      stage: stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      rate: rate * 100,
      status: rate > 0.5 ? "good" : rate > 0.3 ? "warning" : "poor",
    })
  );

  // Prepare time in stage data
  const timeInStageData = Object.entries(pipelineData.averageTimeInStage).map(
    ([stage, days]) => ({
      stage: stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      days: days,
      status: days > 7 ? "slow" : days > 3 ? "normal" : "fast",
    })
  );

  // Prepare funnel data for pipeline visualization
  const funnelData = Object.entries(pipelineData.stageDistribution)
    .sort(([a], [b]) => {
      const stageOrder = [
        "applied",
        "screening",
        "shortlisted",
        "interview_scheduled",
        "interview_completed",
        "offer_extended",
        "offer_accepted",
        "hired",
      ];
      return stageOrder.indexOf(a) - stageOrder.indexOf(b);
    })
    .map(([stage, count]) => ({
      name: stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count,
      fill: COLORS[
        Object.keys(pipelineData.stageDistribution).indexOf(stage) %
          COLORS.length
      ],
    }));

  // Prepare time to fill trend data
  const timeToFillTrendData =
    timeToFillData?.trend?.slice(-30).map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      average: item.average,
      count: item.count,
    })) || [];

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
            <CardDescription>
              Visual representation of candidate flow through pipeline stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <FunnelChart>
                <Tooltip formatter={(value: number) => [value, "Candidates"]} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="center" fill="#fff" stroke="none" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stage Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Distribution</CardTitle>
              <CardDescription>
                Current distribution of candidates across pipeline stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stageDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Candidates"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Conversion Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Rates</CardTitle>
              <CardDescription>
                Percentage of candidates moving between stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={conversionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stage"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis
                    label={{
                      value: "Conversion Rate (%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)}%`,
                      "Conversion Rate",
                    ]}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[4, 4, 0, 0]}
                    fill={(entry: any) => {
                      switch (entry.status) {
                        case "good":
                          return "#00C49F";
                        case "warning":
                          return "#FFBB28";
                        case "poor":
                          return "#FF8042";
                        default:
                          return "#8884d8";
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Time in Stage Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time in Stage Analysis
            </CardTitle>
            <CardDescription>
              Average time candidates spend in each pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={timeInStageData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="stage"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis
                  label={{ value: "Days", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)} days`,
                    "Average Time",
                  ]}
                />
                <Bar
                  dataKey="days"
                  radius={[4, 4, 0, 0]}
                  fill={(entry: any) => {
                    switch (entry.status) {
                      case "fast":
                        return "#00C49F";
                      case "normal":
                        return "#0088FE";
                      case "slow":
                        return "#FF8042";
                      default:
                        return "#8884d8";
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottlenecks Alert */}
        {pipelineData.bottlenecks && pipelineData.bottlenecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Pipeline Bottlenecks Detected
              </CardTitle>
              <CardDescription>
                Stages where candidates are spending excessive time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipelineData.bottlenecks.map((bottleneck, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">
                          {bottleneck.stage
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-orange-700">
                          {bottleneck.candidateCount} candidates affected
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {bottleneck.averageTime.toFixed(1)} days
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time to Fill Trend */}
        {timeToFillTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Time to Fill Trend</CardTitle>
              <CardDescription>
                Historical trend of time to fill over the past 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={timeToFillTrendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    label={{
                      value: "Days",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "average")
                        return [`${value.toFixed(1)} days`, "Avg Time to Fill"];
                      if (name === "count") return [value, "Positions Filled"];
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#0088FE"
                    strokeWidth={3}
                    dot={{ fill: "#0088FE", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
