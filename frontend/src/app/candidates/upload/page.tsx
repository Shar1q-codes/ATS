"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ResumeUpload } from "@/components/candidates/resume-upload";
import { Breadcrumb } from "@/components/layout/navigation";

export default function ResumeUploadPage() {
  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Candidates", href: "/candidates" },
    { name: "Upload Resume" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Upload Resume
          </h1>
          <p className="text-muted-foreground">
            Upload candidate resumes for automatic parsing and profile creation
          </p>
        </div>

        <ResumeUpload />
      </div>
    </MainLayout>
  );
}
