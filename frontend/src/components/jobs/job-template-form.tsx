"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, GripVertical } from "lucide-react";
import {
  useCreateJobTemplateMutation,
  useUpdateJobTemplateMutation,
  useJobFamiliesQuery,
  type JobTemplate,
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

const jobTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  jobFamilyId: z.string().min(1, "Job family is required"),
  level: z.enum(["junior", "mid", "senior", "lead", "principal"]),
  experienceRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
    })
    .refine((data) => data.max >= data.min, {
      message: "Maximum experience must be greater than or equal to minimum",
      path: ["max"],
    }),
  salaryRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.string().min(1),
    })
    .refine((data) => data.max >= data.min, {
      message: "Maximum salary must be greater than or equal to minimum",
      path: ["max"],
    })
    .optional(),
  baseRequirements: z
    .array(requirementSchema)
    .min(1, "At least one requirement is required"),
});

type JobTemplateFormData = z.infer<typeof jobTemplateSchema>;

interface JobTemplateFormProps {
  initialData?: JobTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobTemplateForm({
  initialData,
  onSuccess,
  onCancel,
}: JobTemplateFormProps) {
  const [newAlternative, setNewAlternative] = useState<{
    [key: number]: string;
  }>({});
  const [includeSalary, setIncludeSalary] = useState(
    !!initialData?.salaryRange
  );

  const { data: jobFamilies } = useJobFamiliesQuery();
  const createMutation = useCreateJobTemplateMutation();
  const updateMutation = useUpdateJobTemplateMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobTemplateFormData>({
    resolver: zodResolver(jobTemplateSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          jobFamilyId: initialData.jobFamilyId,
          level: initialData.level,
          experienceRange: initialData.experienceRange,
          salaryRange: initialData.salaryRange,
          baseRequirements: initialData.baseRequirements.map((req) => ({
            ...req,
            alternatives: req.alternatives || [],
          })),
        }
      : {
          name: "",
          jobFamilyId: "",
          level: "mid",
          experienceRange: { min: 0, max: 5 },
          salaryRange: undefined,
          baseRequirements: [],
        },
  });

  const {
    fields: requirementFields,
    append: appendRequirement,
    remove: removeRequirement,
  } = useFieldArray({
    control,
    name: "baseRequirements",
  });

  const addRequirement = () => {
    appendRequirement({
      type: "skill",
      category: "must",
      description: "",
      weight: 5,
      alternatives: [],
    });
  };

  const addAlternative = (requirementIndex: number) => {
    const alternative = newAlternative[requirementIndex];
    if (alternative?.trim()) {
      const currentRequirement = requirementFields[requirementIndex];
      const currentAlternatives = currentRequirement.alternatives || [];
      setValue(`baseRequirements.${requirementIndex}.alternatives`, [
        ...currentAlternatives,
        alternative.trim(),
      ]);
      setNewAlternative({ ...newAlternative, [requirementIndex]: "" });
    }
  };

  const removeAlternative = (
    requirementIndex: number,
    alternativeIndex: number
  ) => {
    const currentRequirement = requirementFields[requirementIndex];
    const currentAlternatives = currentRequirement.alternatives || [];
    setValue(
      `baseRequirements.${requirementIndex}.alternatives`,
      currentAlternatives.filter((_, i) => i !== alternativeIndex)
    );
  };

  const onSubmit = async (data: JobTemplateFormData) => {
    try {
      const submitData = {
        ...data,
        salaryRange: includeSalary ? data.salaryRange : undefined,
      };

      if (initialData) {
        await updateMutation.mutateAsync({
          ...initialData,
          ...submitData,
        });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save job template:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="e.g., Senior Software Engineer"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="jobFamilyId">Job Family</Label>
          <Select
            value={watch("jobFamilyId")}
            onValueChange={(value) => setValue("jobFamilyId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job family" />
            </SelectTrigger>
            <SelectContent>
              {jobFamilies?.map((family) => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.jobFamilyId && (
            <p className="text-sm text-destructive mt-1">
              {errors.jobFamilyId.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="level">Level</Label>
          <Select
            value={watch("level")}
            onValueChange={(value) => setValue("level", value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
            </SelectContent>
          </Select>
          {errors.level && (
            <p className="text-sm text-destructive mt-1">
              {errors.level.message}
            </p>
          )}
        </div>
      </div>

      {/* Experience Range */}
      <Card>
        <CardHeader>
          <CardTitle>Experience Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="experienceMin">Minimum Years</Label>
              <Input
                id="experienceMin"
                type="number"
                min="0"
                {...register("experienceRange.min", { valueAsNumber: true })}
              />
              {errors.experienceRange?.min && (
                <p className="text-sm text-destructive mt-1">
                  {errors.experienceRange.min.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="experienceMax">Maximum Years</Label>
              <Input
                id="experienceMax"
                type="number"
                min="0"
                {...register("experienceRange.max", { valueAsNumber: true })}
              />
              {errors.experienceRange?.max && (
                <p className="text-sm text-destructive mt-1">
                  {errors.experienceRange.max.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Salary Range
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeSalary"
                checked={includeSalary}
                onChange={(e) => setIncludeSalary(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeSalary" className="text-sm font-normal">
                Include salary range
              </Label>
            </div>
          </CardTitle>
        </CardHeader>
        {includeSalary && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={watch("salaryRange.currency") || "USD"}
                  onValueChange={(value) =>
                    setValue("salaryRange.currency", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="salaryMin">Minimum</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  min="0"
                  {...register("salaryRange.min", { valueAsNumber: true })}
                />
                {errors.salaryRange?.min && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.salaryRange.min.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="salaryMax">Maximum</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  min="0"
                  {...register("salaryRange.max", { valueAsNumber: true })}
                />
                {errors.salaryRange?.max && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.salaryRange.max.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Base Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Base Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirementFields.map((field, index) => (
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
                          setValue(
                            `baseRequirements.${index}.type`,
                            value as any
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skill">Skill</SelectItem>
                          <SelectItem value="experience">Experience</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="certification">
                            Certification
                          </SelectItem>
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
                            `baseRequirements.${index}.category`,
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
                        {...register(`baseRequirements.${index}.weight`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      {...register(`baseRequirements.${index}.description`)}
                      placeholder="Describe this requirement..."
                      rows={2}
                    />
                    {errors.baseRequirements?.[index]?.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.baseRequirements[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Alternatives */}
                  <div>
                    <Label>Alternatives</Label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(field.alternatives || []).map(
                          (alternative, altIndex) => (
                            <Badge
                              key={altIndex}
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              {alternative}
                              <button
                                type="button"
                                onClick={() =>
                                  removeAlternative(index, altIndex)
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
                          value={newAlternative[index] || ""}
                          onChange={(e) =>
                            setNewAlternative({
                              ...newAlternative,
                              [index]: e.target.value,
                            })
                          }
                          placeholder="Add alternative..."
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), addAlternative(index))
                          }
                        />
                        <Button
                          type="button"
                          onClick={() => addAlternative(index)}
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
                  onClick={() => removeRequirement(index)}
                  className="mt-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          <Button
            type="button"
            onClick={addRequirement}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Requirement
          </Button>

          {errors.baseRequirements && (
            <p className="text-sm text-destructive">
              {errors.baseRequirements.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
