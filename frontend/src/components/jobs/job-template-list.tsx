"use client";

import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, Filter } from "lucide-react";
import {
  useJobTemplatesQuery,
  useJobFamiliesQuery,
  useDeleteJobTemplateMutation,
  type JobTemplate,
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
import { formatDateTime, capitalizeFirst } from "@/lib/utils";
import { JobTemplateForm } from "./job-template-form";
import { JobTemplatePreview } from "./job-template-preview";

export function JobTemplateList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobFamily, setSelectedJobFamily] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<JobTemplate | null>(
    null
  );

  const { toast } = useToast();
  const {
    data: jobTemplates,
    isLoading,
    error,
  } = useJobTemplatesQuery(
    selectedJobFamily && selectedJobFamily !== "all"
      ? selectedJobFamily
      : undefined
  );
  const { data: jobFamilies } = useJobFamiliesQuery();
  const deleteJobTemplateMutation = useDeleteJobTemplateMutation();

  const filteredTemplates =
    jobTemplates?.filter((template) => {
      const matchesSearch = template.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesLevel =
        !selectedLevel ||
        selectedLevel === "all" ||
        template.level === selectedLevel;
      return matchesSearch && matchesLevel;
    }) || [];

  const handleEdit = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const handleDeleteClick = (template: JobTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteJobTemplateMutation.mutateAsync(templateToDelete.id);
      toast({
        title: "Success",
        description: "Job template deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job template",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    toast({
      title: "Success",
      description: selectedTemplate
        ? "Job template updated successfully"
        : "Job template created successfully",
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "junior":
        return "secondary";
      case "mid":
        return "info";
      case "senior":
        return "warning";
      case "lead":
        return "success";
      case "principal":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getJobFamilyName = (jobFamilyId: string) => {
    return (
      jobFamilies?.find((family) => family.id === jobFamilyId)?.name ||
      "Unknown"
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load job templates</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Templates</h1>
          <p className="text-muted-foreground">
            Manage job templates with specific levels and requirements
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Job Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Templates</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={selectedJobFamily}
              onValueChange={setSelectedJobFamily}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by job family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Families</SelectItem>
                {jobFamilies?.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="principal">Principal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Loading job templates...
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedJobFamily || selectedLevel
                  ? "No job templates match your filters"
                  : "No job templates found"}
              </p>
              {!searchTerm && !selectedJobFamily && !selectedLevel && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job Template
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Family</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Experience Range</TableHead>
                  <TableHead>Salary Range</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>
                      {getJobFamilyName(template.jobFamilyId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLevelColor(template.level) as any}>
                        {capitalizeFirst(template.level)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.experienceRange.min}-
                      {template.experienceRange.max} years
                    </TableCell>
                    <TableCell>
                      {template.salaryRange ? (
                        <span className="text-sm">
                          {template.salaryRange.currency}{" "}
                          {template.salaryRange.min.toLocaleString()}-
                          {template.salaryRange.max.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not specified
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.baseRequirements.length} requirements
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(template.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(template)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Template</DialogTitle>
            <DialogDescription>
              Create a new job template with specific level and requirements.
            </DialogDescription>
          </DialogHeader>
          <JobTemplateForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Template</DialogTitle>
            <DialogDescription>
              Update the job template details and requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <JobTemplateForm
              initialData={selectedTemplate}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Template Preview</DialogTitle>
            <DialogDescription>
              Preview the job template details and requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <JobTemplatePreview jobTemplate={selectedTemplate} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This
              action cannot be undone.
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
              disabled={deleteJobTemplateMutation.isPending}
            >
              {deleteJobTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
