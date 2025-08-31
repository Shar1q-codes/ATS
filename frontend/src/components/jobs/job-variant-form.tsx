"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, GripVertical } from "lucide-react";
import {
  useCreateCompanyJobVariantMutation,
  useUpdateCompanyJobVariantMutation,
  useCompanyProfilesQuery,
  useJobTemplatesQuery,
  type CompanyJobVariant,
  type RequirementItem,
} from "@/hooks/api/use-jobs-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const requirementSchema = z.object({
  type: z.enum(["skill", "experience", "education", "certification", "other"]),
  category: z.enum(["must", "should", "nice"]),
  description: z.string().min(1, "Description is required"),
  weight: z.number().min(1).max(10),
  alternatives: z.array(z.string()).optional(),
});

const jobVariantSchema = z.object({
  jobTemplateId: z.string().min(1, "Job template is required"),
  companyProfileId: z.string().min(1, "Company profile is required"),
  customTitle: z.string().optional(),
  customDescription: z.string().optional(),
  additionalRequirements: z.array(requirementSchema),
  modifiedRequirements: z.array(requirementSchema),
  isActive: z.boolean(),
});

type JobVariantFormData = z.infer<typeof jobVariantSchema>;

interface JobVariantFormProps {
  initialData?: CompanyJobVariant;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobVariantForm({
  initialData,
  onSuccess,
  onCancel,
}: JobVariantFormProps) {
  const [newAlternative, setNewAlternative] = useState<{
    [key: string]: string;
  }>({});

  const { data: companyProfiles } = useCompanyProfilesQuery();
  const { data: jobTemplates } = useJobTemplatesQuery();
  const createMutation = useCreateCompanyJobVariantMutation();
  const updateMutation = useUpdateCompanyJobVariantMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobVariantFormData>({
    resolver: zodResolver(jobVariantSchema),
    defaultValues: initialData
      ? {
          jobTemplateId: initialData.jobTemplateId,
          companyProfileId: initialData.companyProfileId,
          customTitle: initialData.customTitle || "",
          customDescription: initialData.customDescription || "",
          additionalRequirements: initialData.additionalRequirements.map(
            (req) => ({
              ...req,
              alternatives: req.alternatives || [],
            })
          ),
          modifiedRequirements: initialData.modifiedRequirements.map((req) => ({
            ...req,
            alternatives: req.alternatives || [],
          })),
          isActive: initialData.isActive,
        }
      : {
          jobTemplateId: "",
          companyProfileId: "",
          customTitle: "",
          customDescription: "",
          additionalRequirements: [],
          modifiedRequirements: [],
          isActive: true,
        },
  });

  const {
    fields: additionalRequirementFields,
    append: appendAdditionalRequirement,
    remove: removeAdditionalRequirement,
  } = useFieldArray({
    control,
    name: "additionalRequirements",
  });

  const {
    fields: modifiedRequirementFields,
    append: appendModifiedRequirement,
    remove: removeModifiedRequirement,
  } = useFieldArray({
    control,
    name: "modifiedRequirements",
  });

  const addAdditionalRequirement = () => {
    appendAdditionalRequirement({
      type: "skill",
      category: "must",
      description: "",
      weight: 5,
      alternatives: [],
    });
  };

  const addModifiedRequirement = () => {
    appendModifiedRequirement({
      type: "skill",
      category: "must",
      description: "",
      weight: 5,
      alternatives: [],
    });
  };

  const addAlternative = (
    requirementIndex: number,
    type: "additional" | "modified"
  ) => {
    const key = `${type}-${requirementIndex}`;
    const alternative = newAlternative[key];
    if (alternative?.trim()) {
      const fieldName =
        type === "additional"
          ? "additionalRequirements"
          : "modifiedRequirements";
      const currentRequirement =
        type === "additional"
          ? additionalRequirementFields[requirementIndex]
          : modifiedRequirementFields[requirementIndex];
      const currentAlternatives = currentRequirement.alternatives || [];
      setValue(`${fieldName}.${requirementIndex}.alternatives`, [
        ...currentAlternatives,
        alternative.trim(),
      ]);
      setNewAlternative({ ...newAlternative, [key]: "" });
    }
  };

  const removeAlternative = (
    requirementIndex: number,
    alternativeIndex: number,
    type: "additional" | "modified"
  ) => {
    const fieldName =
      type === "additional" ? "additionalRequirements" : "modifiedRequirements";
    const currentRequirement =
      type === "additional"
        ? additionalRequirementFields[requirementIndex]
        : modifiedRequirementFields[requirementIndex];
    const currentAlternatives = currentRequirement.alternatives || [];
    setValue(
      `${fieldName}.${requirementIndex}.alternatives`,
      currentAlternatives.filter((_, i) => i !== alternativeIndex)
    );
  };

  const onSubmit = async (data: JobVariantFormData) => {
    try {
      if (initialData && initialData.id) {
        await updateMutation.mutateAsync({
          ...initialData,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save job variant:", error);
    }
  };

  const renderRequirementFields = (
    fields: any[],
    type: "additional" | "modified",
    removeFunction: (index: number) => void
  ) => {
    return fields.map((field, index) => (
      <Card key={field.id} className="p-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            className="mt-2 cursor-grab hover:cursor-grabbing"
            onMouseDown={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) =>
                    setValue(`${type}Requirements.${index}.type`, value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill">Skill</SelectItem>
                    <SelectItem value="experience">Experience</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={field.category}
                  onValueChange={(value) =>
                    setValue(
                      `${type}Requirements.${index}.category`,
                      value as any
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="must">Must Have</SelectItem>
                    <SelectItem value="should">Should Have</SelectItem>
                    <SelectItem value="nice">Nice to Have</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Weight (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  {...register(`${type}Requirements.${index}.weight`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                {...register(`${type}Requirements.${index}.description`)}
                placeholder="Describe this requirement..."
                rows={2}
              />
            </div>

            {/* Alternatives */}
            <div>
              <Label>Alternatives</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(field.alternatives || []).map(
                    (alternative: string, altIndex: number) => (
                      <Badge
                        key={altIndex}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {alternative}
                        <button
                          type="button"
                          onClick={() =>
                            removeAlternative(index, altIndex, type)
                          }
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newAlternative[`${type}-${index}`] || ""}
                    onChange={(e) =>
                      setNewAlternative({
                        ...newAlternative,
                        [`${type}-${index}`]: e.target.value,
                      })
                    }
                    placeholder="Add alternative..."
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addAlternative(index, type))
                    }
                  />
                  <Button
                    type="button"
                    onClick={() => addAlternative(index, type)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeFunction(index)}
            className="mt-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    ));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyProfileId">Company Profile</Label>
              <Select
                value={watch("companyProfileId")}
                onValueChange={(value) => setValue("companyProfileId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company profile" />
                </SelectTrigger>
                <SelectContent>
                  {companyProfiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyProfileId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.companyProfileId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="jobTemplateId">Job Template</Label>
              <Select
                value={watch("jobTemplateId")}
                onValueChange={(value) => setValue("jobTemplateId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job template" />
                </SelectTrigger>
                <SelectContent>
                  {jobTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jobTemplateId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.jobTemplateId.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="customTitle">Custom Title (Optional)</Label>
            <Input
              id="customTitle"
              {...register("customTitle")}
              placeholder="Override the template title..."
            />
          </div>

          <div>
            <Label htmlFor="customDescription">
              Custom Description (Optional)
            </Label>
            <Textarea
              id="customDescription"
              {...register("customDescription")}
              placeholder="Add custom description or override template description..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="rounded"
            />
            <Label htmlFor="isActive">
              Active (available for applications)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Additional Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderRequirementFields(
            additionalRequirementFields,
            "additional",
            removeAdditionalRequirement
          )}

          <Button
            type="button"
            onClick={addAdditionalRequirement}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Additional Requirement
          </Button>
        </CardContent>
      </Card>

      {/* Modified Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Modified Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderRequirementFields(
            modifiedRequirementFields,
            "modified",
            removeModifiedRequirement
          )}

          <Button
            type="button"
            onClick={addModifiedRequirement}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Modified Requirement
          </Button>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
