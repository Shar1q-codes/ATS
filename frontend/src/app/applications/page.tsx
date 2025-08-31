"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ApplicationPipeline } from "@/components/applications/application-pipeline";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/navigation";

export default function ApplicationsPage() {
  const [filters, setFilters] = React.useState({});

  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Applications" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb items={breadcrumbItems} />
            <h1 className="text-3xl font-bold tracking-tight mt-2">
              Application Pipeline
            </h1>
            <p className="text-muted-foreground">
              Manage candidates through your recruitment pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/analytics/pipeline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button asChild>
              <Link href="/applications/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Application
              </Link>
            </Button>
          </div>
        </div>

        <ApplicationFilters onFiltersChange={setFilters} />
        <ApplicationPipeline filters={filters} />
      </div>
    </MainLayout>
  );
}
