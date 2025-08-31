"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { CandidateDetail } from "@/components/candidates/candidate-detail";
import { Breadcrumb } from "@/components/layout/navigation";
import { useCandidateQuery } from "@/hooks/api/use-candidates-api";
import { Loading } from "@/components/ui/loading";

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params.id as string;

  const { data: candidate, isLoading, error } = useCandidateQuery(candidateId);

  const breadcrumbItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Candidates", href: "/candidates" },
    {
      name: candidate
        ? `${candidate.firstName} ${candidate.lastName}`
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

  if (error || !candidate) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">Candidate not found</h2>
          <p className="text-muted-foreground mt-2">
            The candidate you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <CandidateDetail candidate={candidate} />
      </div>
    </MainLayout>
  );
}
