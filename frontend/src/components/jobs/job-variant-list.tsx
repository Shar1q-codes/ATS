"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  useCompanyJobVariantsQuery,
  useCompanyProfilesQuery,
  useJobTemplatesQuery,
  useDeleteCompanyJobVariantMutation,
  type CompanyJobVariant,
} from "@/hooks/api/use-jobs-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { JobVariantForm } from "./job-variant-form";
import { JobVariantPreview } from "./job-variant-preview";

export function JobVariantList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedVariant, setSelectedVariant] =
    useState<CompanyJobVariant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] =
    useState<CompanyJobVariant | null>(null);

  const { toast } = useToast();
  const {
    data: jobVariants,
    isLoading,
    error,
  } = useCompanyJobVariantsQuery(
    selectedCompany && selectedCompany !== "all" ? selectedCompany : undefined,
    selectedTemplate && selectedTemplate !== "all"
      ? selectedTemplate
      : undefined
  );
  const { data: companyProfiles } = useCompanyProfilesQuery();
  const { data: jobTemplates } = useJobTemplatesQuery();
  const deleteJobVariantMutation = useDeleteCompanyJobVariantMutation();

  const filteredVariants =
    jobVariants?.filter((variant) => {
      const matchesSearch =
        (variant.customTitle || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (variant.customDescription || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesSearch;
    }) || [];

  const handleEdit = (variant: CompanyJobVariant) => {
    setSelectedVariant(variant);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (variant: CompanyJobVariant) => {
    setSelectedVariant(variant);
    setIsPreviewDialogOpen(true);
  };

  const handleDeleteClick = (variant: CompanyJobVariant) => {
    setVariantToDelete(variant);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!variantToDelete) return;

    try {
      await deleteJobVariantMutation.mutateAsync(variantToDelete.id);
      toast({
        title: "Success",
        description: "Job variant deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setVariantToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job variant",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedVariant(null);
    toast({
      title: "Success",
      description: selectedVariant
        ? "Job variant updated successfully"
        : "Job variant created successfully",
    });
  };

  const handleDuplicate = (variant: CompanyJobVariant) => {
    setSelectedVariant({
      ...variant,
      id: "", // Clear ID to create new variant
      customTitle: `${variant.customTitle || ""} (Copy)`,
      isActive: false,
      publishedAt: undefined,
    });
    setIsCreateDialogOpen(true);
  };

  const getCompanyName = (companyProfileId: string) => {
    return (
      companyProfiles?.find((company) => company.id === companyProfileId)
        ?.name || "Unknown"
    );
  };

  const getTemplateName = (jobTemplateId: string) => {
    return (
      jobTemplates?.find((template) => template.id === jobTemplateId)?.name ||
      "Unknown"
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load job variants</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Variants</h1>
          <p className="text-muted-foreground">
            Manage company-specific job variations and customizations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Job Variant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Variants</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job variants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyProfiles?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {jobTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Loading job variants...
              </div>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCompany || selectedTemplate
                  ? "No job variants match your filters"
                  : "No job variants found"}
              </p>
              {!searchTerm && !selectedCompany && !selectedTemplate && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job Variant
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">
                      {variant.customTitle ||
                        getTemplateName(variant.jobTemplateId)}
                    </TableCell>
                    <TableCell>
                      {getCompanyName(variant.companyProfileId)}
                    </TableCell>
                    <TableCell>
                      {getTemplateName(variant.jobTemplateId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={variant.isActive ? "success" : "secondary"}
                      >
                        {variant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          +{variant.additionalRequirements.length} added
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {variant.modifiedRequirements.length} modified
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {variant.publishedAt ? (
                        <Badge variant="success">
                          {formatDateTime(variant.publishedAt)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not published</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(variant.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(variant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(variant)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(variant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(variant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Variant</DialogTitle>
            <DialogDescription>
              Create a new job variant by customizing a template for a specific
              company.
            </DialogDescription>
          </DialogHeader>
          <JobVariantForm
            initialData={selectedVariant}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              setSelectedVariant(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Variant</DialogTitle>
            <DialogDescription>
              Update the job variant customizations and requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedVariant && (
            <JobVariantForm
              initialData={selectedVariant}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Variant Preview</DialogTitle>
            <DialogDescription>
              Preview the complete job variant with all customizations applied.
            </DialogDescription>
          </DialogHeader>
          {selectedVariant && (
            <JobVariantPreview jobVariant={selectedVariant} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Variant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job variant? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteJobVariantMutation.isPending}
            >
              {deleteJobVariantMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
