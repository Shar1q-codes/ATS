"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { CandidateForm } from "@/components/candidates/candidate-form";
import { Breadcrumb } from "@/components/layout/navigation";

export default function NewCandidatePage() {
  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Candidates", href: "/candidates" },
    { name: "Add Candidate" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Add New Candidate
          </h1>
          <p className="text-muted-foreground">
            Create a new candidate profile manually
          </p>
        </div>

        <CandidateForm />
      </div>
    </MainLayout>
  );
}
