"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateApplicationMutation,
  type CreateApplicationData,
} from "@/hooks/api/use-applications-api";
import { useCandidatesQuery } from "@/hooks/api/use-candidates-api";
import { useCompanyJobVariantsQuery } from "@/hooks/api/use-jobs-api";
import { Save, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

const applicationSchema = z.object({
  candidateId: z.string().min(1, "Please select a candidate"),
  companyJobVariantId: z.string().min(1, "Please select a job"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  onSuccess?: (application: any) => void;
}

export function ApplicationForm({ onSuccess }: ApplicationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [candidateSearch, setCandidateSearch] = React.useState("");
  const [jobSearch, setJobSearch] = React.useState("");

  const createApplicationMutation = useCreateApplicationMutation();

  // Fetch candidates and jobs
  const { data: candidatesData } = useCandidatesQuery({
    search: candidateSearch,
    limit: 50,
  });

  const { data: jobsData } = useCompanyJobVariantsQuery();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const selectedCandidateId = watch("candidateId");
  const selectedJobId = watch("companyJobVariantId");

  const selectedCandidate = candidatesData?.candidates?.find(
    (c) => c.id === selectedCandidateId
  );
  const selectedJob = jobsData?.find((j) => j.id === selectedJobId);

  const onSubmit = async (data: ApplicationFormData) => {
    try {
      const applicationData: CreateApplicationData = {
        candidateId: data.candidateId,
        companyJobVariantId: data.companyJobVariantId,
      };

      const newApplication =
        await createApplicationMutation.mutateAsync(applicationData);

      toast({
        title: "Application created successfully",
        description: `${selectedCandidate?.firstName} ${selectedCandidate?.lastName} has been added to the pipeline for ${selectedJob?.title}`,
      });

      if (onSuccess) {
        onSuccess(newApplication);
      } else {
        router.push(`/applications/${newApplication.id}`);
      }
    } catch (error) {
      toast({
        title: "Failed to create application",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidate Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Candidate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="candidateSearch">Search Candidates</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="candidateSearch"
                    type="text"
                    placeholder="Search by name or email..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateId">
                  Candidate <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue("candidateId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a candidate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {candidatesData?.candidates?.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {candidate.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.candidateId && (
                  <p className="text-sm text-destructive">
                    {errors.candidateId.message}
                  </p>
                )}
              </div>

              {selectedCandidate && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">Selected Candidate</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCandidate.email}
                  </p>
                  {selectedCandidate.location && (
                    <p className="text-sm text-muted-foreground">
                      {selectedCandidate.location}
                    </p>
                  )}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/candidates/${selectedCandidate.id}`}
                        target="_blank"
                      >
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobSearch">Search Jobs</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    id="jobSearch"
                    type="text"
                    placeholder="Search by title or company..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyJobVariantId">
                  Job <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("companyJobVariantId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobsData?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {job.customTitle || "Job Variant"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ID: {job.id}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companyJobVariantId && (
                  <p className="text-sm text-destructive">
                    {errors.companyJobVariantId.message}
                  </p>
                )}
              </div>

              {selectedJob && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium">Selected Job</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedJob.customTitle || "Job Variant"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedJob.id}
                  </p>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/jobs/variants/${selectedJob.id}`}
                        target="_blank"
                      >
                        View Job Details
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {selectedCandidate && selectedJob && (
          <Card>
            <CardHeader>
              <CardTitle>Application Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </h4>
                  <p className="text-sm text-muted-foreground">applying for</p>
                  <h4 className="font-medium">
                    {selectedJob.customTitle || "Job Variant"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    ID: {selectedJob.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">Applied</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/applications">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Application
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
