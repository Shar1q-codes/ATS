"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { ApplicationDetail } from "@/components/applications/application-detail";
import { Breadcrumb } from "@/components/layout/navigation";
import { useApplicationQuery } from "@/hooks/api/use-applications-api";
import { Loading } from "@/components/ui/loading";

export default function ApplicationDetailPage() {
  const params = useParams();
  const applicationId = params.id as string;

  const {
    data: application,
    isLoading,
    error,
  } = useApplicationQuery(applicationId);

  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Applications", href: "/applications" },
    {
      name: application
        ? `${application.candidate?.firstName} ${application.candidate?.lastName} - ${application.job?.title}`
        : "Loading...",
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  if (error || !application) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">Application not found</h2>
          <p className="text-muted-foreground mt-2">
            The application you're looking for doesn't exist or has been
            removed.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <ApplicationDetail application={application} />
      </div>
    </MainLayout>
  );
}
