"use client";

import * as React from "react";
import Link from "next/link";
import {
  useCandidatesQuery,
  type CandidateFilters,
} from "@/hooks/api/use-candidates-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProgressiveList, VirtualList } from "@/components/ui/lazy-loading";
import { OptimizedAvatar } from "@/components/ui/optimized-image";
import {
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePerformanceMonitor } from "@/lib/performance-monitor";

interface CandidateListProps {
  filters: CandidateFilters;
}

export function CandidateList({ filters }: CandidateListProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedCandidates, setSelectedCandidates] = React.useState<string[]>(
    []
  );
  const [viewMode, setViewMode] = React.useState<"table" | "cards" | "virtual">(
    "table"
  );
  const { measureApiCall } = usePerformanceMonitor();

  const { data, isLoading, error } = useCandidatesQuery({
    ...filters,
    page: currentPage,
    limit: 50, // Increased for better performance with virtual scrolling
  });

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (!data?.candidates) return;

    const allIds = data.candidates.map((c) => c.id);
    setSelectedCandidates(
      selectedCandidates.length === allIds.length ? [] : allIds
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>Failed to load candidates. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.candidates?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No candidates found matching your criteria.</p>
            <Button asChild className="mt-4">
              <Link href="/candidates/upload">Upload Resume</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { candidates, total, totalPages } = data;

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedCandidates.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCandidates.length} candidate(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Export Selected
                </Button>
                <Button variant="outline" size="sm">
                  Send Email
                </Button>
                <Button variant="destructive" size="sm">
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === candidates.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => handleSelectCandidate(candidate.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/candidates/${candidate.id}`}
                        className="font-medium hover:underline"
                      >
                        {candidate.firstName} {candidate.lastName}
                      </Link>
                      {candidate.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-1 h-3 w-3" />
                          {candidate.location}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="mr-1 h-3 w-3" />
                        {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="mr-1 h-3 w-3" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {candidate.parsedData?.skills
                        ?.slice(0, 3)
                        .map((skill) => (
                          <Badge
                            key={skill.name}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      {(candidate.parsedData?.skills?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(candidate.parsedData?.skills?.length || 0) - 3}{" "}
                          more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {candidate.parsedData?.totalExperience
                        ? `${candidate.parsedData.totalExperience} years`
                        : "Not specified"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDistanceToNow(new Date(candidate.createdAt), {
                        addSuffix: true,
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/candidates/${candidate.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, total)} of {total} candidates
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
