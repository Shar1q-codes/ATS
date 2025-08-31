"use client";

import { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useOrganization } from "../../hooks/api/use-organizations-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { OrganizationSettings } from "../../components/organization/organization-settings";
import { UserManagement } from "../../components/organization/user-management";
import { OrganizationBranding } from "../../components/organization/organization-branding";
import { OrganizationAnalytics } from "../../components/organization/organization-analytics";
import { Loading } from "../../components/ui/loading";

export default function OrganizationPage() {
  const { user } = useAuth();
  const {
    data: organization,
    isLoading,
    error,
  } = useOrganization(user?.organizationId || "");
  const [activeTab, setActiveTab] = useState("settings");

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Loading />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load organization details. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your organization settings, users, and preferences.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">General Settings</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <OrganizationSettings organization={organization} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <OrganizationBranding organization={organization} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <OrganizationAnalytics organizationId={organization.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
