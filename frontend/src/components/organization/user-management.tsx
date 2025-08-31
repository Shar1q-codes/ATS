"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { Loading } from "../ui/loading";
import {
  useOrganizationUsers,
  useUpdateUserRole,
  useRemoveUserFromOrganization,
  OrganizationUser,
} from "../../hooks/api/use-organizations-api";
import { useAuth } from "../../hooks/use-auth";

interface UserManagementProps {
  organizationId: string;
}

export function UserManagement({ organizationId }: UserManagementProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const {
    data: users,
    isLoading,
    error,
  } = useOrganizationUsers(organizationId);
  const updateUserRole = useUpdateUserRole();
  const removeUser = useRemoveUserFromOrganization();
  const [, setSelectedUser] = useState<OrganizationUser | null>(null);

  const handleRoleChange = async (
    userId: string,
    newRole: OrganizationUser["role"]
  ) => {
    try {
      await updateUserRole.mutateAsync({
        organizationId,
        userId,
        role: newRole,
      });

      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUser.mutateAsync({
        organizationId,
        userId,
      });

      toast({
        title: "User removed",
        description: "User has been removed from the organization.",
      });

      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: OrganizationUser["role"]) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "recruiter":
        return "default";
      case "hiring_manager":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatRoleDisplay = (role: OrganizationUser["role"]) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "recruiter":
        return "Recruiter";
      case "hiring_manager":
        return "Hiring Manager";
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Loading />
        </CardContent>
      </Card>
    );
  }

  if (error || !users) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load users. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage users in your organization and their roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {users.length} user{users.length !== 1 ? "s" : ""} in your
              organization
            </p>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {currentUser?.role === "admin" &&
                      user.id !== currentUser?.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(
                              user.id,
                              value as OrganizationUser["role"]
                            )
                          }
                          disabled={updateUserRole.isPending}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="hiring_manager">
                              Hiring Manager
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {formatRoleDisplay(user.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentUser?.role === "admin" &&
                        user.id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove{" "}
                                  {user.firstName} {user.lastName} from your
                                  organization? This action cannot be undone and
                                  they will lose access to all organization
                                  data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  onClick={() => setSelectedUser(null)}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {currentUser?.role !== "admin" && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p>
                You need administrator privileges to manage users and roles.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
