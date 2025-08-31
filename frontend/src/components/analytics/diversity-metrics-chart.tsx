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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { DiversityMetrics } from "@/hooks/api/use-analytics-api";
import { AlertTriangle, Users, MapPin, Briefcase, Award } from "lucide-react";

interface DiversityMetricsChartProps {
  data: DiversityMetrics;
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

export function DiversityMetricsChart({
  data,
  className,
}: DiversityMetricsChartProps) {
  // Prepare gender distribution data
  const genderData = Object.entries(data.genderDistribution).map(
    ([gender, count], index) => ({
      name: gender.charAt(0).toUpperCase() + gender.slice(1),
      value: count,
      color: COLORS[index % COLORS.length],
    })
  );

  // Prepare location distribution data (top 8)
  const locationData = Object.entries(data.locationDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([location, count], index) => ({
      name: location.length > 20 ? location.substring(0, 20) + "..." : location,
      fullName: location,
      value: count,
      color: COLORS[index % COLORS.length],
    }));

  // Prepare experience distribution data
  const experienceData = Object.entries(data.experienceDistribution).map(
    ([level, count], index) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
      color: COLORS[index % COLORS.length],
    })
  );

  // Prepare skills distribution data (top 10)
  const skillsData = data.skillsDistribution
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((skill, index) => ({
      name:
        skill.skill.length > 15
          ? skill.skill.substring(0, 15) + "..."
          : skill.skill,
      fullName: skill.skill,
      count: skill.count,
      averageFitScore: skill.averageFitScore,
      color: COLORS[index % COLORS.length],
    }));

  // Prepare bias indicators for radar chart
  const biasRadarData = data.biasIndicators.map((indicator) => ({
    metric:
      indicator.metric.length > 15
        ? indicator.metric.substring(0, 15) + "..."
        : indicator.metric,
    fullMetric: indicator.metric,
    score: Math.max(0, 100 - (indicator.value / indicator.threshold) * 100), // Convert to positive score (higher is better)
    status: indicator.status,
  }));

  const getBiasStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getBiasStatusBadge = (status: string) => {
    switch (status) {
      case "good":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Bias Indicators Alert */}
        {data.biasIndicators.some(
          (indicator) => indicator.status === "critical"
        ) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Bias Indicators Detected</AlertTitle>
            <AlertDescription>
              Some metrics indicate potential bias in your recruitment process.
              Review the detailed analysis below.
            </AlertDescription>
          </Alert>
        )}

        {/* Bias Indicators Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Bias Detection Overview
            </CardTitle>
            <CardDescription>
              Overall bias detection scores across different metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={biasRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" fontSize={12} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  fontSize={10}
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name="Bias Score"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(1)}%`,
                    "Fairness Score",
                    props.payload.fullMetric,
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gender Distribution
              </CardTitle>
              <CardDescription>
                Gender representation in candidate pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
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

          {/* Experience Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Experience Level Distribution
              </CardTitle>
              <CardDescription>
                Distribution by experience level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={experienceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis
                    label={{
                      value: "Candidates",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Candidates"]}
                  />
                  <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geographic Distribution
            </CardTitle>
            <CardDescription>Top locations by candidate count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={locationData}
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
                    value: "Candidates",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value: number) => [value, "Candidates"]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skills Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Skills Analysis
            </CardTitle>
            <CardDescription>
              Most common skills and their average fit scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={skillsData}
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
                    value: "Candidate Count",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Avg Fit Score (%)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "count") return [value, "Candidates"];
                    if (name === "averageFitScore")
                      return [`${value.toFixed(1)}%`, "Avg Fit Score"];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  fill="#FFBB28"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="averageFitScore"
                  fill="#FF8042"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Bias Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Bias Analysis</CardTitle>
            <CardDescription>
              Individual bias indicators with thresholds and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.biasIndicators.map((indicator, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{indicator.metric}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {indicator.description}
                      </p>
                    </div>
                    <Badge variant={getBiasStatusBadge(indicator.status)}>
                      {indicator.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Current Value:{" "}
                      </span>
                      <span
                        className={`font-medium ${getBiasStatusColor(indicator.status)}`}
                      >
                        {indicator.value.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Threshold: </span>
                      <span className="font-medium">
                        {indicator.threshold.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            indicator.status === "good"
                              ? "bg-green-500"
                              : indicator.status === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (indicator.value / indicator.threshold) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
