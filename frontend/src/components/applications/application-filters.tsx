"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, Calendar } from "lucide-react";
import {
  type ApplicationFilters,
  type PipelineStage,
} from "@/hooks/api/use-applications-api";

interface ApplicationFiltersProps {
  onFiltersChange: (filters: ApplicationFilters) => void;
}

const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "interview_completed", label: "Interview Completed" },
  { value: "offer_extended", label: "Offer Extended" },
  { value: "offer_accepted", label: "Offer Accepted" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

export function ApplicationFilters({
  onFiltersChange,
}: ApplicationFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [selectedStatuses, setSelectedStatuses] = React.useState<
    PipelineStage[]
  >([]);
  const [fitScoreMin, setFitScoreMin] = React.useState("");
  const [fitScoreMax, setFitScoreMax] = React.useState("");
  const [appliedAfter, setAppliedAfter] = React.useState("");
  const [appliedBefore, setAppliedBefore] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("appliedAt");
  const [sortOrder, setSortOrder] = React.useState<string>("desc");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const applyFilters = React.useCallback(() => {
    const filters: ApplicationFilters = {
      search: search.trim() || undefined,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      fitScoreMin: fitScoreMin ? parseInt(fitScoreMin) : undefined,
      fitScoreMax: fitScoreMax ? parseInt(fitScoreMax) : undefined,
      appliedAfter: appliedAfter || undefined,
      appliedBefore: appliedBefore || undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    onFiltersChange(filters);
  }, [
    search,
    selectedStatuses,
    fitScoreMin,
    fitScoreMax,
    appliedAfter,
    appliedBefore,
    sortBy,
    sortOrder,
    onFiltersChange,
  ]);

  // Apply filters when any filter changes
  React.useEffect(() => {
    const debounceTimer = setTimeout(applyFilters, 300);
    return () => clearTimeout(debounceTimer);
  }, [applyFilters]);

  const addStatus = (status: PipelineStage) => {
    if (!selectedStatuses.includes(status)) {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const removeStatus = (statusToRemove: PipelineStage) => {
    setSelectedStatuses(
      selectedStatuses.filter((status) => status !== statusToRemove)
    );
  };

  const clearAllFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setFitScoreMin("");
    setFitScoreMax("");
    setAppliedAfter("");
    setAppliedBefore("");
    setSortBy("appliedAt");
    setSortOrder("desc");
  };

  const hasActiveFilters =
    search ||
    selectedStatuses.length > 0 ||
    fitScoreMin ||
    fitScoreMax ||
    appliedAfter ||
    appliedBefore;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Simple" : "Advanced"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by candidate name, job title, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {showAdvanced && (
          <>
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Pipeline Stages</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedStatuses.map((status) => {
                  const stageInfo = PIPELINE_STAGES.find(
                    (s) => s.value === status
                  );
                  return (
                    <Badge
                      key={status}
                      variant="secondary"
                      className="cursor-pointer"
                    >
                      {stageInfo?.label || status}
                      <X
                        className="ml-1 h-3 w-3"
                        onClick={() => removeStatus(status)}
                      />
                    </Badge>
                  );
                })}
              </div>
              <Select
                onValueChange={(value) => addStatus(value as PipelineStage)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add pipeline stage..." />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.filter(
                    (stage) => !selectedStatuses.includes(stage.value)
                  ).map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fit Score Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fitScoreMin">Min Fit Score (%)</Label>
                <Input
                  id="fitScoreMin"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={fitScoreMin}
                  onChange={(e) => setFitScoreMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fitScoreMax">Max Fit Score (%)</Label>
                <Input
                  id="fitScoreMax"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={fitScoreMax}
                  onChange={(e) => setFitScoreMax(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appliedAfter">Applied After</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="appliedAfter"
                    type="date"
                    value={appliedAfter}
                    onChange={(e) => setAppliedAfter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appliedBefore">Applied Before</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="appliedBefore"
                    type="date"
                    value={appliedBefore}
                    onChange={(e) => setAppliedBefore(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sort Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appliedAt">Application Date</SelectItem>
                <SelectItem value="fitScore">Fit Score</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Order</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
