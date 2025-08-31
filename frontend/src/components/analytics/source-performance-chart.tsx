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
  ScatterChart,
  Scatter,
} from "recharts";
import {
  SourcePerformance,
  CandidateSourceMetrics,
} from "@/hooks/api/use-analytics-api";
import { TrendingUp, Users, Target, DollarSign } from "lucide-react";

interface SourcePerformanceChartProps {
  sourceData: SourcePerformance;
  candidateSourceData?: CandidateSourceMetrics;
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

export function SourcePerformanceChart({
  sourceData,
  candidateSourceData,
  className,
}: SourcePerformanceChartProps) {
  // Prepare source performance data for bar chart
  const sourcePerformanceData = sourceData.sources
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10)
    .map((source, index) => ({
      name:
        source.source.length > 15
          ? source.source.substring(0, 15) + "..."
          : source.source,
      fullName: source.source,
      candidates: source.candidates,
      applications: source.applications,
      hired: source.hired,
      conversionRate: source.conversionRate * 100,
      averageFitScore: source.averageFitScore,
      costPerHire: source.costPerHire || 0,
      color: COLORS[index % COLORS.length],
    }));

  // Prepare candidate source distribution for pie chart
  const candidateSourceDistribution =
    candidateSourceData?.sources.map((source, index) => ({
      name: source.name,
      value: source.count,
      percentage: source.percentage,
      color: COLORS[index % COLORS.length],
    })) || [];

  // Prepare ROI analysis data (sources with cost data)
  const roiData = sourceData.sources
    .filter((source) => source.costPerHire && source.costPerHire > 0)
    .map((source, index) => ({
      name:
        source.source.length > 15
          ? source.source.substring(0, 15) + "..."
          : source.source,
      fullName: source.source,
      costPerHire: source.costPerHire,
      conversionRate: source.conversionRate * 100,
      hired: source.hired,
      roi:
        source.hired > 0
          ? ((source.hired * 50000 - source.costPerHire * source.hired) /
              (source.costPerHire * source.hired)) *
            100
          : 0, // Assuming $50k value per hire
    }));

  // Prepare trend data
  const trendData =
    candidateSourceData?.trends?.slice(-14).map((trend) => ({
      date: new Date(trend.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      ...trend.sources,
      total: Object.values(trend.sources).reduce((a, b) => a + b, 0),
    })) || [];

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Source Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Source Performance Comparison
            </CardTitle>
            <CardDescription>
              Conversion rates and candidate volumes by source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={sourcePerformanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Conversion Rate (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Candidates",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "conversionRate")
                      return [`${value.toFixed(1)}%`, "Conversion Rate"];
                    if (name === "candidates") return [value, "Candidates"];
                    if (name === "applications") return [value, "Applications"];
                    if (name === "hired") return [value, "Hired"];
                    return [value, name];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="conversionRate"
                  fill="#0088FE"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="candidates"
                  fill="#00C49F"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Candidate Source Distribution */}
          {candidateSourceDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Candidate Source Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of candidates by source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={candidateSourceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage.toFixed(1)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {candidateSourceDistribution.map((entry, index) => (
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
          )}

          {/* Quality vs Volume Scatter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quality vs Volume Analysis
              </CardTitle>
              <CardDescription>
                Fit score vs candidate volume by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid />
                  <XAxis
                    type="number"
                    dataKey="candidates"
                    name="Candidates"
                    label={{
                      value: "Candidates",
                      position: "insideBottom",
                      offset: -10,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="averageFitScore"
                    name="Avg Fit Score"
                    label={{
                      value: "Avg Fit Score (%)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number, name: string) => {
                      if (name === "averageFitScore")
                        return [`${value.toFixed(1)}%`, "Avg Fit Score"];
                      if (name === "candidates") return [value, "Candidates"];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullName || label
                    }
                  />
                  <Scatter
                    name="Sources"
                    data={sourcePerformanceData}
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ROI Analysis */}
        {roiData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                ROI Analysis
              </CardTitle>
              <CardDescription>
                Cost per hire and return on investment by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={roiData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis
                    label={{
                      value: "Cost per Hire ($)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "costPerHire")
                        return [`$${value.toFixed(0)}`, "Cost per Hire"];
                      if (name === "roi")
                        return [`${value.toFixed(1)}%`, "ROI"];
                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="costPerHire"
                    fill="#FF8042"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Source Performance Trends */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Source Performance Trends</CardTitle>
              <CardDescription>
                Historical candidate volume trends by source over the past 14
                days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={trendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis
                    label={{
                      value: "Candidates",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
                    name="Total Candidates"
                  />
                  {/* Add lines for top 3 sources */}
                  {candidateSourceData?.sources
                    .slice(0, 3)
                    .map((source, index) => (
                      <Line
                        key={source.name}
                        type="monotone"
                        dataKey={source.name}
                        stroke={COLORS[index]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[index], strokeWidth: 1, r: 3 }}
                        name={source.name}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
