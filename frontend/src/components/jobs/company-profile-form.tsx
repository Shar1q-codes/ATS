"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import {
  useCreateCompanyProfileMutation,
  useUpdateCompanyProfileMutation,
  type CompanyProfile,
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

const companyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  size: z.enum(["startup", "small", "medium", "large", "enterprise"]),
  culture: z.array(z.string()).min(1, "At least one culture value is required"),
  benefits: z.array(z.string()).min(1, "At least one benefit is required"),
  workArrangement: z.enum(["remote", "hybrid", "onsite"]),
  location: z.string().min(1, "Location is required"),
  preferences: z.object({
    prioritySkills: z.array(z.string()),
    dealBreakers: z.array(z.string()),
    niceToHave: z.array(z.string()),
  }),
});

type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

interface CompanyProfileFormProps {
  initialData?: CompanyProfile;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyProfileForm({
  initialData,
  onSuccess,
  onCancel,
}: CompanyProfileFormProps) {
  const [newCultureItem, setNewCultureItem] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [newPrioritySkill, setNewPrioritySkill] = useState("");
  const [newDealBreaker, setNewDealBreaker] = useState("");
  const [newNiceToHave, setNewNiceToHave] = useState("");

  const createMutation = useCreateCompanyProfileMutation();
  const updateMutation = useUpdateCompanyProfileMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          industry: initialData.industry,
          size: initialData.size,
          culture: initialData.culture,
          benefits: initialData.benefits,
          workArrangement: initialData.workArrangement,
          location: initialData.location,
          preferences: initialData.preferences,
        }
      : {
          name: "",
          industry: "",
          size: "small",
          culture: [],
          benefits: [],
          workArrangement: "hybrid",
          location: "",
          preferences: {
            prioritySkills: [],
            dealBreakers: [],
            niceToHave: [],
          },
        },
  });

  const culture = watch("culture");
  const benefits = watch("benefits");
  const preferences = watch("preferences");

  const addCultureItem = () => {
    if (newCultureItem.trim() && !culture.includes(newCultureItem.trim())) {
      setValue("culture", [...culture, newCultureItem.trim()]);
      setNewCultureItem("");
    }
  };

  const removeCultureItem = (item: string) => {
    setValue(
      "culture",
      culture.filter((c) => c !== item)
    );
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !benefits.includes(newBenefit.trim())) {
      setValue("benefits", [...benefits, newBenefit.trim()]);
      setNewBenefit("");
    }
  };

  const removeBenefit = (benefit: string) => {
    setValue(
      "benefits",
      benefits.filter((b) => b !== benefit)
    );
  };

  const addPrioritySkill = () => {
    if (
      newPrioritySkill.trim() &&
      !preferences.prioritySkills.includes(newPrioritySkill.trim())
    ) {
      setValue("preferences.prioritySkills", [
        ...preferences.prioritySkills,
        newPrioritySkill.trim(),
      ]);
      setNewPrioritySkill("");
    }
  };

  const removePrioritySkill = (skill: string) => {
    setValue(
      "preferences.prioritySkills",
      preferences.prioritySkills.filter((s) => s !== skill)
    );
  };

  const addDealBreaker = () => {
    if (
      newDealBreaker.trim() &&
      !preferences.dealBreakers.includes(newDealBreaker.trim())
    ) {
      setValue("preferences.dealBreakers", [
        ...preferences.dealBreakers,
        newDealBreaker.trim(),
      ]);
      setNewDealBreaker("");
    }
  };

  const removeDealBreaker = (dealBreaker: string) => {
    setValue(
      "preferences.dealBreakers",
      preferences.dealBreakers.filter((d) => d !== dealBreaker)
    );
  };

  const addNiceToHave = () => {
    if (
      newNiceToHave.trim() &&
      !preferences.niceToHave.includes(newNiceToHave.trim())
    ) {
      setValue("preferences.niceToHave", [
        ...preferences.niceToHave,
        newNiceToHave.trim(),
      ]);
      setNewNiceToHave("");
    }
  };

  const removeNiceToHave = (item: string) => {
    setValue(
      "preferences.niceToHave",
      preferences.niceToHave.filter((n) => n !== item)
    );
  };

  const onSubmit = async (data: CompanyProfileFormData) => {
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
      console.error("Failed to save company profile:", error);
    }
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
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Acme Corp"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                {...register("industry")}
                placeholder="e.g., Technology, Healthcare"
              />
              {errors.industry && (
                <p className="text-sm text-destructive mt-1">
                  {errors.industry.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="size">Company Size</Label>
              <Select
                value={watch("size")}
                onValueChange={(value) => setValue("size", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup (1-10)</SelectItem>
                  <SelectItem value="small">Small (11-50)</SelectItem>
                  <SelectItem value="medium">Medium (51-200)</SelectItem>
                  <SelectItem value="large">Large (201-1000)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                </SelectContent>
              </Select>
              {errors.size && (
                <p className="text-sm text-destructive mt-1">
                  {errors.size.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="workArrangement">Work Arrangement</Label>
              <Select
                value={watch("workArrangement")}
                onValueChange={(value) =>
                  setValue("workArrangement", value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
              {errors.workArrangement && (
                <p className="text-sm text-destructive mt-1">
                  {errors.workArrangement.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="e.g., San Francisco, CA"
            />
            {errors.location && (
              <p className="text-sm text-destructive mt-1">
                {errors.location.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Culture */}
      <Card>
        <CardHeader>
          <CardTitle>Company Culture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {culture.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeCultureItem(item)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCultureItem}
              onChange={(e) => setNewCultureItem(e.target.value)}
              placeholder="Add culture value..."
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addCultureItem())
              }
            />
            <Button type="button" onClick={addCultureItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.culture && (
            <p className="text-sm text-destructive">{errors.culture.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits & Perks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {benefits.map((benefit) => (
              <Badge
                key={benefit}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {benefit}
                <button
                  type="button"
                  onClick={() => removeBenefit(benefit)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              placeholder="Add benefit..."
              onKeyPress={(e) =>
                e.key === "Enter" && (e.preventDefault(), addBenefit())
              }
            />
            <Button type="button" onClick={addBenefit}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.benefits && (
            <p className="text-sm text-destructive">
              {errors.benefits.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Priority Skills */}
          <div>
            <Label>Priority Skills</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {preferences.prioritySkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removePrioritySkill(skill)}
                      className="ml-1 hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newPrioritySkill}
                  onChange={(e) => setNewPrioritySkill(e.target.value)}
                  placeholder="Add priority skill..."
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), addPrioritySkill())
                  }
                />
                <Button type="button" onClick={addPrioritySkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Deal Breakers */}
          <div>
            <Label>Deal Breakers</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {preferences.dealBreakers.map((dealBreaker) => (
                  <Badge
                    key={dealBreaker}
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    {dealBreaker}
                    <button
                      type="button"
                      onClick={() => removeDealBreaker(dealBreaker)}
                      className="ml-1 hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDealBreaker}
                  onChange={(e) => setNewDealBreaker(e.target.value)}
                  placeholder="Add deal breaker..."
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addDealBreaker())
                  }
                />
                <Button type="button" onClick={addDealBreaker}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Nice to Have */}
          <div>
            <Label>Nice to Have</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {preferences.niceToHave.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeNiceToHave(item)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newNiceToHave}
                  onChange={(e) => setNewNiceToHave(e.target.value)}
                  placeholder="Add nice to have..."
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addNiceToHave())
                  }
                />
                <Button type="button" onClick={addNiceToHave}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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
