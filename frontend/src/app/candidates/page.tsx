"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { withLazyLoading, TableSkeleton } from "@/components/ui/lazy-loading";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/navigation";
import { usePerformanceMonitor } from "@/lib/performance-monitor";

// Lazy load heavy components
const CandidateList = withLazyLoading(
  () =>
    import("@/components/candidates/candidate-list").then((m) => ({
      default: m.CandidateList,
    })),
  <TableSkeleton rows={10} columns={5} />
);

const CandidateFilters = withLazyLoading(() =>
  import("@/components/candidates/candidate-filters").then((m) => ({
    default: m.CandidateFilters,
  }))
);

export default function CandidatesPage() {
  const [filters, setFilters] = React.useState({});
  const { measureRender } = usePerformanceMonitor();

  // Measure component render time
  React.useEffect(() => {
    const endMeasure = measureRender("CandidatesPage");
    return endMeasure;
  }, [measureRender]);

  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Candidates" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-3xl font-bold tracking-tight mt-2">
              Candidates
            </h1>
            <p className="text-muted-foreground">
              Manage and search through your candidate database
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/candidates/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Resume
              </Link>
            </Button>
            <Button asChild>
              <Link href="/candidates/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Link>
            </Button>
          </div>
        </div>

        <CandidateFilters onFiltersChange={setFilters} />
        <CandidateList filters={filters} />
      </div>
    </MainLayout>
  );
}
