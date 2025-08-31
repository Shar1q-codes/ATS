"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, GripVertical } from "lucide-react";
import {
  useCreateJobFamilyMutation,
  useUpdateJobFamilyMutation,
  type JobFamily,
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

const jobFamilySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  skillCategories: z
    .array(z.string())
    .min(1, "At least one skill category is required"),
  baseRequirements: z
    .array(requirementSchema)
    .min(1, "At least one requirement is required"),
});

type JobFamilyFormData = z.infer<typeof jobFamilySchema>;

interface JobFamilyFormProps {
  initialData?: JobFamily;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JobFamilyForm({
  initialData,
  onSuccess,
  onCancel,
}: JobFamilyFormProps) {
  const [newSkillCategory, setNewSkillCategory] = useState("");
  const [newAlternative, setNewAlternative] = useState<{
    [key: number]: string;
  }>({});

  const createMutation = useCreateJobFamilyMutation();
  const updateMutation = useUpdateJobFamilyMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JobFamilyFormData>({
    resolver: zodResolver(jobFamilySchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description,
          skillCategories: initialData.skillCategories,
          baseRequirements: initialData.baseRequirements.map((req) => ({
            ...req,
            alternatives: req.alternatives || [],
          })),
        }
      : {
          name: "",
          description: "",
          skillCategories: [],
          baseRequirements: [],
        },
  });

  const {
    fields: requirementFields,
    append: appendRequirement,
    remove: removeRequirement,
    move: moveRequirement,
  } = useFieldArray({
    control,
    name: "baseRequirements",
  });

  const skillCategories = watch("skillCategories");

  const addSkillCategory = () => {
    if (
      newSkillCategory.trim() &&
      !skillCategories.includes(newSkillCategory.trim())
    ) {
      setValue("skillCategories", [
        ...skillCategories,
        newSkillCategory.trim(),
      ]);
      setNewSkillCategory("");
    }
  };

  const removeSkillCategory = (category: string) => {
    setValue(
      "skillCategories",
      skillCategories.filter((c) => c !== category)
    );
  };

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

  const onSubmit = async (data: JobFamilyFormData) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({
          ...initialData,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save job family:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="e.g., Software Engineer"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Describe this job family..."
            rows={3}
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      {/* Skill Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {skillCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {category}
                <button
                  type="button"
                  onClick={() => removeSkillCategory(category)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value)}
              placeholder="Add skill category..."
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addSkillCategory())
              }
            />
            <Button type="button" onClick={addSkillCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.skillCategories && (
            <p className="text-sm text-destructive">
              {errors.skillCategories.message}
            </p>
          )}
        </CardContent>
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
                  onMouseDown={(e) => {
                    // Simple drag handle - in a real app you'd implement proper drag and drop
                    e.preventDefault();
                  }}
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
