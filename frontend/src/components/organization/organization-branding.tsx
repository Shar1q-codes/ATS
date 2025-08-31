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
import { useToast } from "../../hooks/use-toast";
import {
  useUpdateOrganization,
  Organization,
} from "../../hooks/api/use-organizations-api";

const brandingSchema = z.object({
  logoUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color")
    .optional()
    .or(z.literal("")),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color")
    .optional()
    .or(z.literal("")),
});

type BrandingForm = z.infer<typeof brandingSchema>;

interface OrganizationBrandingProps {
  organization: Organization;
}

export function OrganizationBranding({
  organization,
}: OrganizationBrandingProps) {
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logoUrl: organization.logoUrl || "",
      primaryColor: organization.primaryColor || "",
      secondaryColor: organization.secondaryColor || "",
    },
  });

  const onSubmit = async (data: BrandingForm) => {
    try {
      await updateOrganization.mutateAsync({
        id: organization.id,
        data: {
          ...(data.logoUrl && { logoUrl: data.logoUrl }),
          ...(data.primaryColor && { primaryColor: data.primaryColor }),
          ...(data.secondaryColor && { secondaryColor: data.secondaryColor }),
        },
      });

      toast({
        title: "Branding updated",
        description: "Organization branding has been updated successfully.",
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to update organization branding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    form.reset({
      logoUrl: organization.logoUrl || "",
      primaryColor: organization.primaryColor || "",
      secondaryColor: organization.secondaryColor || "",
    });
    setIsEditing(false);
  };

  const primaryColor = form.watch("primaryColor");
  const secondaryColor = form.watch("secondaryColor");
  const logoUrl = form.watch("logoUrl");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Branding</CardTitle>
        <CardDescription>
          Customize your organization's visual identity and branding elements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                {...form.register("logoUrl")}
                placeholder="https://example.com/logo.png"
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
              {form.formState.errors.logoUrl && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.logoUrl.message}
                </p>
              )}
            </div>

            {/* Logo Preview */}
            <div className="space-y-2">
              <Label>Logo Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/50 min-h-[100px] flex items-center justify-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Organization Logo"
                    className="max-h-16 max-w-48 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (
                        e.currentTarget.nextElementSibling as HTMLElement
                      ).style.display = "block";
                    }}
                  />
                ) : null}
                <div
                  className={`text-muted-foreground text-sm ${logoUrl ? "hidden" : "block"}`}
                >
                  {logoUrl ? "Failed to load image" : "No logo uploaded"}
                </div>
              </div>
            </div>
          </div>

          {/* Color Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="primaryColor"
                  {...form.register("primaryColor")}
                  placeholder="#3B82F6"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted" : ""}
                />
                {primaryColor && (
                  <div
                    className="w-10 h-10 rounded border border-border"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </div>
              {form.formState.errors.primaryColor && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.primaryColor.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="secondaryColor"
                  {...form.register("secondaryColor")}
                  placeholder="#6B7280"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted" : ""}
                />
                {secondaryColor && (
                  <div
                    className="w-10 h-10 rounded border border-border"
                    style={{ backgroundColor: secondaryColor }}
                  />
                )}
              </div>
              {form.formState.errors.secondaryColor && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.secondaryColor.message}
                </p>
              )}
            </div>
          </div>

          {/* Brand Preview */}
          <div className="space-y-2">
            <Label>Brand Preview</Label>
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-4">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <h3 className="text-lg font-semibold">{organization.name}</h3>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  style={{
                    backgroundColor: primaryColor || "#3B82F6",
                    borderColor: primaryColor || "#3B82F6",
                  }}
                  className="text-white"
                >
                  Primary Button
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  style={{
                    borderColor: secondaryColor || "#6B7280",
                    color: secondaryColor || "#6B7280",
                  }}
                >
                  Secondary Button
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Branding
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
            <h4 className="text-sm font-medium">Branding Guidelines</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Logo should be in PNG or SVG format for best quality</li>
              <li>
                • Recommended logo dimensions: 200x50px or similar aspect ratio
              </li>
              <li>• Colors should be in hex format (e.g., #3B82F6)</li>
              <li>• Primary color is used for buttons and highlights</li>
              <li>
                • Secondary color is used for borders and secondary elements
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
