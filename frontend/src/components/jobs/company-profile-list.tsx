"use client";

import React, { useState } from "react";
import { Plus, Search, Edit, Trash2, Eye, Building } from "lucide-react";
import {
  useCompanyProfilesQuery,
  useDeleteCompanyProfileMutation,
  type CompanyProfile,
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
import { formatDateTime, capitalizeFirst } from "@/lib/utils";
import { CompanyProfileForm } from "./company-profile-form";
import { CompanyProfilePreview } from "./company-profile-preview";

export function CompanyProfileList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfile | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<CompanyProfile | null>(
    null
  );

  const { toast } = useToast();
  const { data: companyProfiles, isLoading, error } = useCompanyProfilesQuery();
  const deleteCompanyProfileMutation = useDeleteCompanyProfileMutation();

  const filteredProfiles =
    companyProfiles?.filter(
      (profile) =>
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.location.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleEdit = (profile: CompanyProfile) => {
    setSelectedProfile(profile);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (profile: CompanyProfile) => {
    setSelectedProfile(profile);
    setIsPreviewDialogOpen(true);
  };

  const handleDeleteClick = (profile: CompanyProfile) => {
    setProfileToDelete(profile);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;

    try {
      await deleteCompanyProfileMutation.mutateAsync(profileToDelete.id);
      toast({
        title: "Success",
        description: "Company profile deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setProfileToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete company profile",
        variant: "destructive",
      });
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedProfile(null);
    toast({
      title: "Success",
      description: selectedProfile
        ? "Company profile updated successfully"
        : "Company profile created successfully",
    });
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case "startup":
        return "info";
      case "small":
        return "secondary";
      case "medium":
        return "warning";
      case "large":
        return "success";
      case "enterprise":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getWorkArrangementColor = (arrangement: string) => {
    switch (arrangement) {
      case "remote":
        return "info";
      case "hybrid":
        return "warning";
      case "onsite":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load company profiles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Profiles</h1>
          <p className="text-muted-foreground">
            Manage company profiles and preferences for job customization
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Company Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Company Profiles</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
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
                Loading company profiles...
              </div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No company profiles match your search"
                  : "No company profiles found"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Company Profile
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Work Arrangement</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Culture</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.name}
                    </TableCell>
                    <TableCell>{profile.industry}</TableCell>
                    <TableCell>
                      <Badge variant={getSizeColor(profile.size) as any}>
                        {capitalizeFirst(profile.size)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getWorkArrangementColor(
                            profile.workArrangement
                          ) as any
                        }
                      >
                        {capitalizeFirst(profile.workArrangement)}
                      </Badge>
                    </TableCell>
                    <TableCell>{profile.location}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.culture.slice(0, 2).map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className="text-xs"
                          >
                            {item}
                          </Badge>
                        ))}
                        {profile.culture.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.culture.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(profile.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(profile)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(profile)}
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
            <DialogTitle>Create Company Profile</DialogTitle>
            <DialogDescription>
              Create a new company profile with preferences and settings.
            </DialogDescription>
          </DialogHeader>
          <CompanyProfileForm
            onSuccess={handleFormSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company Profile</DialogTitle>
            <DialogDescription>
              Update the company profile details and preferences.
            </DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <CompanyProfileForm
              initialData={selectedProfile}
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
            <DialogTitle>Company Profile Preview</DialogTitle>
            <DialogDescription>
              Preview the company profile details and preferences.
            </DialogDescription>
          </DialogHeader>
          {selectedProfile && (
            <CompanyProfilePreview companyProfile={selectedProfile} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{profileToDelete?.name}"? This
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
              disabled={deleteCompanyProfileMutation.isPending}
            >
              {deleteCompanyProfileMutation.isPending
                ? "Deleting..."
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
