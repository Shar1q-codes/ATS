"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobFamilyList } from "@/components/jobs/job-family-list";
import { JobTemplateList } from "@/components/jobs/job-template-list";
import { CompanyProfileList } from "@/components/jobs/company-profile-list";
import { JobVariantList } from "@/components/jobs/job-variant-list";

export default function JobsPage() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="families" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="families">Job Families</TabsTrigger>
          <TabsTrigger value="templates">Job Templates</TabsTrigger>
          <TabsTrigger value="companies">Company Profiles</TabsTrigger>
          <TabsTrigger value="variants">Job Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="families" className="space-y-6">
          <JobFamilyList />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <JobTemplateList />
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <CompanyProfileList />
        </TabsContent>

        <TabsContent value="variants" className="space-y-6">
          <JobVariantList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
