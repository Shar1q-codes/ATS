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
} from "recharts";
import { RecruitmentMetrics } from "@/hooks/api/use-analytics-api";

interface RecruitmentMetricsChartProps {
  data: RecruitmentMetrics;
  className?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function RecruitmentMetricsChart({
  data,
  className,
}: RecruitmentMetricsChartProps) {
  // Prepare conversion rate data for bar chart
  const conversionData = [
    {
      stage: "Applied → Screening",
      rate: data.conversionRates.appliedToScreening * 100,
      color: COLORS[0],
    },
    {
      stage: "Screening → Interview",
      rate: data.conversionRates.screeningToInterview * 100,
      color: COLORS[1],
    },
    {
      stage: "Interview → Offer",
      rate: data.conversionRates.interviewToOffer * 100,
      color: COLORS[2],
    },
    {
      stage: "Offer → Hired",
      rate: data.conversionRates.offerToHired * 100,
      color: COLORS[3],
    },
  ];

  // Prepare top performing jobs data
  const topJobsData = data.topPerformingJobs.slice(0, 5).map((job, index) => ({
    name:
      job.jobTitle.length > 20
        ? job.jobTitle.substring(0, 20) + "..."
        : job.jobTitle,
    applications: job.applications,
    fitScore: job.averageFitScore,
    timeToFill: job.timeToFill,
  }));

  return (
    <div className={className}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Rates Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rates by Stage</CardTitle>
            <CardDescription>
              Percentage of candidates moving between pipeline stages
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
                <Bar dataKey="rate" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Jobs</CardTitle>
            <CardDescription>
              Jobs with highest application volumes and fit scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topJobsData}
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
                    value: "Applications",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "applications") return [value, "Applications"];
                    if (name === "fitScore")
                      return [`${value.toFixed(1)}%`, "Avg Fit Score"];
                    if (name === "timeToFill")
                      return [`${value} days`, "Time to Fill"];
                    return [value, name];
                  }}
                />
                <Bar
                  dataKey="applications"
                  fill="#0088FE"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Job Performance Comparison */}
      {topJobsData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Job Performance Comparison</CardTitle>
            <CardDescription>
              Compare fit scores and time to fill across top performing jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={topJobsData}
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
                    value: "Fit Score (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Time to Fill (days)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "fitScore")
                      return [`${value.toFixed(1)}%`, "Avg Fit Score"];
                    if (name === "timeToFill")
                      return [`${value} days`, "Time to Fill"];
                    return [value, name];
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="fitScore"
                  stroke="#00C49F"
                  strokeWidth={3}
                  dot={{ fill: "#00C49F", strokeWidth: 2, r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="timeToFill"
                  stroke="#FF8042"
                  strokeWidth={3}
                  dot={{ fill: "#FF8042", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
