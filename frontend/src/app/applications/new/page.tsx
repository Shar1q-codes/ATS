"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ApplicationForm } from "@/components/applications/application-form";
import { Breadcrumb } from "@/components/layout/navigation";

export default function NewApplicationPage() {
  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Applications", href: "/applications" },
    { name: "Add Application" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Add New Application
          </h1>
          <p className="text-muted-foreground">
            Create a new application by matching a candidate to a job
          </p>
        </div>

        <ApplicationForm />
      </div>
    </MainLayout>
  );
}
