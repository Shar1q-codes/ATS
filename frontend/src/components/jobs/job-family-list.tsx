"use client";

import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import {
  useJobFamiliesQuery,
  useDeleteJobFamilyMutation,
  type JobFamily,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { JobFamilyForm } from "./job-family-form";
import { JobFamilyPreview } from "./job-family-preview";

export function JobFamilyList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<JobFamily | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState<JobFamily | null>(null);

  const { toast } = useToast();
  const { data: jobFamilies, isLoading, error } = useJobFamiliesQuery();
  const deleteJobFamilyMutation = useDeleteJobFamilyMutation();

  const filteredFamilies =
    jobFamilies?.filter(
      (family) =>
        family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        family.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleEdit = (family: JobFamily) => {
    setSelectedFamily(family);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (family: JobFamily) => {
    setSelectedFamily(family);
    setIsPreviewDialogOpen(true);
  };

  const handleDeleteClick = (family: JobFamily) => {
    setFamilyToDelete(family);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!familyToDelete) return;

    try {
      await deleteJobFamilyMutation.mutateAsync(familyToDelete.id);
      toast({
        title: "Success",
        description: "Job family deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setFamilyToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job family",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedFamily(null);
    toast({
      title: "Success",
      description: selectedFamily
        ? "Job family updated successfully"
        : "Job family created successfully",
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load job families</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Families</h1>
          <p className="text-muted-foreground">
            Manage canonical job templates and base requirements
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Job Family
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Job Families</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job families..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Loading job families...
              </div>
            </div>
          ) : filteredFamilies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No job families match your search"
                  : "No job families found"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Job Family
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Skill Categories</TableHead>
                  <TableHead>Requirements</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilies.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {family.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {family.skillCategories.slice(0, 3).map((category) => (
                          <Badge
                            key={category}
                            variant="secondary"
                            className="text-xs"
                          >
                            {category}
                          </Badge>
                        ))}
                        {family.skillCategories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{family.skillCategories.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {family.baseRequirements.length} requirements
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(family.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(family)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(family)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(family)}
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
            <DialogTitle>Create Job Family</DialogTitle>
            <DialogDescription>
              Create a new job family with base requirements and skill
              categories.
            </DialogDescription>
          </DialogHeader>
          <JobFamilyForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Family</DialogTitle>
            <DialogDescription>
              Update the job family details and requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedFamily && (
            <JobFamilyForm
              initialData={selectedFamily}
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
            <DialogTitle>Job Family Preview</DialogTitle>
            <DialogDescription>
              Preview the job family details and requirements.
            </DialogDescription>
          </DialogHeader>
          {selectedFamily && <JobFamilyPreview jobFamily={selectedFamily} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Family</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{familyToDelete?.name}"? This
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
              disabled={deleteJobFamilyMutation.isPending}
            >
              {deleteJobFamilyMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
