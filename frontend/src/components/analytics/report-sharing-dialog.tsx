"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Share2,
  Lock,
  Calendar,
  Users,
  Link,
  Mail,
  Check,
} from "lucide-react";
import { useShareReportMutation } from "@/hooks/api/use-analytics-api";
import { LoadingSpinner } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";

interface ReportSharingDialogProps {
  reportId: string;
  reportName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportSharingDialog({
  reportId,
  reportName,
  isOpen,
  onClose,
}: ReportSharingDialogProps) {
  const [permissions, setPermissions] = React.useState<"view" | "edit">("view");
  const [hasExpiration, setHasExpiration] = React.useState(false);
  const [expirationDate, setExpirationDate] = React.useState("");
  const [hasPassword, setHasPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [shareUrl, setShareUrl] = React.useState("");
  const [emailRecipients, setEmailRecipients] = React.useState("");
  const [emailMessage, setEmailMessage] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const shareReportMutation = useShareReportMutation();
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    try {
      const result = await shareReportMutation.mutateAsync({
        reportId,
        permissions,
        expiresAt: hasExpiration ? expirationDate : undefined,
        password: hasPassword ? password : undefined,
      });

      setShareUrl(result.shareUrl);
      toast({
        title: "Success",
        description: "Share link generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Share link copied to clipboard",
      });
    }
  };

  const handleSendEmail = () => {
    if (!shareUrl) {
      toast({
        title: "Error",
        description: "Please generate a share link first",
        variant: "destructive",
      });
      return;
    }

    const subject = `Shared Report: ${reportName}`;
    const body = `${emailMessage}\n\nView the report here: ${shareUrl}`;
    const mailtoUrl = `mailto:${emailRecipients}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.open(mailtoUrl);
  };

  const resetForm = () => {
    setPermissions("view");
    setHasExpiration(false);
    setExpirationDate("");
    setHasPassword(false);
    setPassword("");
    setShareUrl("");
    setEmailRecipients("");
    setEmailMessage("");
    setCopied(false);
  };

  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Report
          </DialogTitle>
          <DialogDescription>
            Share "{reportName}" with others by generating a secure link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Permissions */}
          <div className="space-y-2">
            <Label>Permissions</Label>
            <Select
              value={permissions}
              onValueChange={(value: "view" | "edit") => setPermissions(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>View Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>View & Edit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiration">Set Expiration Date</Label>
              <Switch
                id="expiration"
                checked={hasExpiration}
                onCheckedChange={setHasExpiration}
              />
            </div>
            {hasExpiration && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>

          {/* Password Protection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password Protection</Label>
              <Switch
                id="password"
                checked={hasPassword}
                onCheckedChange={setHasPassword}
              />
            </div>
            {hasPassword && (
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Generate Link */}
          <div className="space-y-3">
            <Button
              onClick={handleGenerateLink}
              disabled={shareReportMutation.isPending}
              className="w-full"
            >
              {shareReportMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              Generate Share Link
            </Button>

            {shareUrl && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Share Link</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {permissions === "view" ? "View Only" : "View & Edit"}
                    </Badge>
                    {hasExpiration && (
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        Expires
                      </Badge>
                    )}
                    {hasPassword && (
                      <Badge variant="outline">
                        <Lock className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Email Sharing */}
          {shareUrl && (
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send via Email
              </Label>
              <Input
                placeholder="Enter email addresses (comma separated)"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
              />
              <Textarea
                placeholder="Add a personal message (optional)"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
              />
              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={!emailRecipients.trim()}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
