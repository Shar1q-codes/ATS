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
import { Search, Filter, X } from "lucide-react";
import { type CandidateFilters } from "@/hooks/api/use-candidates-api";

interface CandidateFiltersProps {
  onFiltersChange: (filters: CandidateFilters) => void;
}

export function CandidateFilters({ onFiltersChange }: CandidateFiltersProps) {
  const [search, setSearch] = React.useState("");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [location, setLocation] = React.useState("");
  const [experienceMin, setExperienceMin] = React.useState("");
  const [experienceMax, setExperienceMax] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<string>("desc");
  const [skillInput, setSkillInput] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const applyFilters = React.useCallback(() => {
    const filters: CandidateFilters = {
      search: search.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
      location: location.trim() || undefined,
      experienceMin: experienceMin ? parseInt(experienceMin) : undefined,
      experienceMax: experienceMax ? parseInt(experienceMax) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    onFiltersChange(filters);
  }, [
    search,
    skills,
    location,
    experienceMin,
    experienceMax,
    sortBy,
    sortOrder,
    onFiltersChange,
  ]);

  // Apply filters when any filter changes
  React.useEffect(() => {
    const debounceTimer = setTimeout(applyFilters, 300);
    return () => clearTimeout(debounceTimer);
  }, [applyFilters]);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const clearAllFilters = () => {
    setSearch("");
    setSkills([]);
    setLocation("");
    setExperienceMin("");
    setExperienceMax("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setSkillInput("");
  };

  const hasActiveFilters =
    search || skills.length > 0 || location || experienceMin || experienceMax;

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
              placeholder="Search by name, email, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {showAdvanced && (
          <>
            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2">
                <Input
                  id="skills"
                  placeholder="Add skill..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                />
                <Button type="button" onClick={addSkill} size="sm">
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="cursor-pointer"
                    >
                      {skill}
                      <X
                        className="ml-1 h-3 w-3"
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, State, or Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Experience Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experienceMin">Min Experience (years)</Label>
                <Input
                  id="experienceMin"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={experienceMin}
                  onChange={(e) => setExperienceMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceMax">Max Experience (years)</Label>
                <Input
                  id="experienceMax"
                  type="number"
                  min="0"
                  placeholder="20"
                  value={experienceMax}
                  onChange={(e) => setExperienceMax(e.target.value)}
                />
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
                <SelectItem value="createdAt">Date Added</SelectItem>
                <SelectItem value="firstName">First Name</SelectItem>
                <SelectItem value="lastName">Last Name</SelectItem>
                <SelectItem value="totalExperience">Experience</SelectItem>
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
