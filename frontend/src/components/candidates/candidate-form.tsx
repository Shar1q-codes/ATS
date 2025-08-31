"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateCandidateMutation,
  type CreateCandidateData,
} from "@/hooks/api/use-candidates-api";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

const candidateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z
    .string()
    .url("Invalid LinkedIn URL")
    .optional()
    .or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("Invalid portfolio URL")
    .optional()
    .or(z.literal("")),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: "Consent is required to create a candidate profile",
  }),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

interface CandidateFormProps {
  candidate?: any; // For editing existing candidates
  onSuccess?: (candidate: any) => void;
}

export function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const createCandidateMutation = useCreateCandidateMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: candidate?.firstName || "",
      lastName: candidate?.lastName || "",
      email: candidate?.email || "",
      phone: candidate?.phone || "",
      location: candidate?.location || "",
      linkedinUrl: candidate?.linkedinUrl || "",
      portfolioUrl: candidate?.portfolioUrl || "",
      consentGiven: candidate?.consentGiven || false,
    },
  });

  const onSubmit = async (data: CandidateFormData) => {
    try {
      const candidateData: CreateCandidateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        location: data.location || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        portfolioUrl: data.portfolioUrl || undefined,
        consentGiven: data.consentGiven,
      };

      const newCandidate =
        await createCandidateMutation.mutateAsync(candidateData);

      toast({
        title: "Candidate created successfully",
        description: `${newCandidate.firstName} ${newCandidate.lastName} has been added to your candidates.`,
      });

      if (onSuccess) {
        onSuccess(newCandidate);
      } else {
        router.push(`/candidates/${newCandidate.id}`);
      }
    } catch (error) {
      toast({
        title: "Failed to create candidate",
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
          <Link href="/candidates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Candidates
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="City, State, Country"
                />
                {errors.location && (
                  <p className="text-sm text-destructive">
                    {errors.location.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Online Presence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
              <Input
                id="linkedinUrl"
                type="url"
                {...register("linkedinUrl")}
                placeholder="https://linkedin.com/in/username"
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-destructive">
                  {errors.linkedinUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolioUrl">Portfolio/Website</Label>
              <Input
                id="portfolioUrl"
                type="url"
                {...register("portfolioUrl")}
                placeholder="https://portfolio.com"
              />
              {errors.portfolioUrl && (
                <p className="text-sm text-destructive">
                  {errors.portfolioUrl.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="consentGiven"
                {...register("consentGiven")}
                className="mt-1 rounded border-gray-300"
              />
              <div className="space-y-1">
                <Label htmlFor="consentGiven" className="text-sm font-normal">
                  I consent to the processing of my personal data for
                  recruitment purposes
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you agree to allow us to store and
                  process your personal information for recruitment purposes in
                  accordance with our privacy policy.
                </p>
              </div>
            </div>
            {errors.consentGiven && (
              <p className="text-sm text-destructive mt-2">
                {errors.consentGiven.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/candidates">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              "Creating..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Candidate
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
