"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useUploadResumeMutation,
  useCreateCandidateMutation,
} from "@/hooks/api/use-candidates-api";
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  candidateId?: string;
  error?: string;
}

export function ResumeUpload() {
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const createCandidateMutation = useCreateCandidateMutation();
  const uploadResumeMutation = useUploadResumeMutation();

  const acceptedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/png",
    "image/gif",
  ];

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return FileText;
    if (file.type.startsWith("image/")) return ImageIcon;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const uploadFiles: UploadedFile[] = validFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...uploadFiles]);

    // Start processing files
    uploadFiles.forEach((uploadFile) => {
      processFile(uploadFile);
    });
  };

  const processFile = async (uploadFile: UploadedFile) => {
    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "uploading", progress: 10 }
            : f
        )
      );

      // Create a temporary candidate first
      const candidateData = {
        email: `temp-${uploadFile.id}@example.com`, // Will be updated after parsing
        firstName: "Parsing",
        lastName: "Resume",
        consentGiven: true,
      };

      const candidate =
        await createCandidateMutation.mutateAsync(candidateData);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, candidateId: candidate.id, progress: 30 }
            : f
        )
      );

      // Upload and parse resume
      const result = await uploadResumeMutation.mutateAsync({
        candidateId: candidate.id,
        file: uploadFile.file,
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, progress: 30 + progress * 0.7 }
                : f
            )
          );
        },
      });

      // Mark as completed
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "completed", progress: 100 }
            : f
        )
      );

      toast({
        title: "Resume processed successfully",
        description: `${result.candidate.firstName} ${result.candidate.lastName} has been added to your candidates.`,
      });
    } catch (error) {
      console.error("Error processing file:", error);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to process resume",
              }
            : f
        )
      );

      toast({
        title: "Failed to process resume",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "pending", progress: 0, error: undefined }
            : f
        )
      );
      processFile(file);
    }
  };

  const viewCandidate = (candidateId: string) => {
    router.push(`/candidates/${candidateId}`);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Resumes</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ease-in-out",
              isDragOver
                ? "border-primary bg-primary/10 scale-105 shadow-lg"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={cn(
                "transition-all duration-300",
                isDragOver && "animate-pulse"
              )}
            >
              <Upload
                className={cn(
                  "mx-auto h-12 w-12 mb-4 transition-colors duration-300",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
              <h3
                className={cn(
                  "text-lg font-semibold mb-2 transition-colors duration-300",
                  isDragOver && "text-primary"
                )}
              >
                {isDragOver
                  ? "Drop files here!"
                  : "Drop resumes here or click to browse"}
              </h3>
              <p className="text-muted-foreground mb-4">
                Supports PDF, DOCX, DOC, and image files up to 10MB
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant={isDragOver ? "default" : "outline"}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Files
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((uploadFile) => {
                const FileIcon = getFileIcon(uploadFile.file);

                return (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">
                          {uploadFile.file.name}
                        </p>
                        <Badge
                          variant={
                            uploadFile.status === "completed"
                              ? "default"
                              : uploadFile.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {uploadFile.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {formatFileSize(uploadFile.file.size)}
                      </p>

                      {uploadFile.status !== "pending" &&
                        uploadFile.status !== "completed" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {uploadFile.status === "uploading" &&
                                  "Uploading..."}
                                {uploadFile.status === "processing" &&
                                  "Processing..."}
                              </span>
                              <span>{Math.round(uploadFile.progress)}%</span>
                            </div>
                            <Progress
                              value={uploadFile.progress}
                              className="h-2"
                            />
                          </div>
                        )}

                      {uploadFile.error && (
                        <p className="text-sm text-destructive mt-1">
                          {uploadFile.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadFile.status === "completed" &&
                        uploadFile.candidateId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              viewCandidate(uploadFile.candidateId!)
                            }
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        )}

                      {uploadFile.status === "error" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryFile(uploadFile.id)}
                        >
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Retry
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
