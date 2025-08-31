"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useToast } from "../../hooks/use-toast";
import {
  useUpdateOrganization,
  Organization,
} from "../../hooks/api/use-organizations-api";

const organizationSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().optional(),
  type: z.enum(["startup", "smb", "agency", "enterprise"]),
});

type OrganizationSettingsForm = z.infer<typeof organizationSettingsSchema>;

interface OrganizationSettingsProps {
  organization: Organization;
}

export function OrganizationSettings({
  organization,
}: OrganizationSettingsProps) {
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<OrganizationSettingsForm>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: organization.name,
      domain: organization.domain || "",
      type: organization.type,
    },
  });

  const onSubmit = async (data: OrganizationSettingsForm) => {
    try {
      await updateOrganization.mutateAsync({
        id: organization.id,
        data: {
          ...data,
          ...(data.domain && { domain: data.domain }),
        },
      });

      toast({
        title: "Settings updated",
        description: "Organization settings have been updated successfully.",
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to update organization settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    form.reset({
      name: organization.name,
      domain: organization.domain || "",
      type: organization.type,
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Manage your organization's basic information and configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain (Optional)</Label>
              <Input
                id="domain"
                {...form.register("domain")}
                placeholder="example.com"
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
              {form.formState.errors.domain && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.domain.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Organization Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as any)}
                disabled={!isEditing}
              >
                <SelectTrigger className={!isEditing ? "bg-muted" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="smb">Small/Medium Business</SelectItem>
                  <SelectItem value="agency">Recruitment Agency</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Input
                value={
                  organization.subscriptionPlan.charAt(0).toUpperCase() +
                  organization.subscriptionPlan.slice(1)
                }
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your subscription plan.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Settings
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateOrganization.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateOrganization.isPending}>
                  {updateOrganization.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </form>

        <div className="border-t pt-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Organization ID</h4>
            <p className="text-sm text-muted-foreground font-mono">
              {organization.id}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Created</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(organization.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
