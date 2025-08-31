"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
}

const presetRanges = [
  {
    label: "Last 7 days",
    getValue: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last 90 days",
    getValue: () => ({
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last 6 months",
    getValue: () => ({
      start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }),
  },
  {
    label: "Last year",
    getValue: () => ({
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }),
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: value.start ? new Date(value.start) : undefined,
    to: value.end ? new Date(value.end) : undefined,
  });

  const handlePresetSelect = (preset: string) => {
    const range = presetRanges.find((p) => p.label === preset);
    if (range) {
      const newRange = range.getValue();
      onChange(newRange);
      setSelectedRange({
        from: new Date(newRange.start),
        to: new Date(newRange.end),
      });
    }
  };

  const handleDateSelect = (
    range: { from: Date | undefined; to: Date | undefined } | undefined
  ) => {
    if (range) {
      setSelectedRange(range);
      if (range.from && range.to) {
        onChange({
          start: range.from.toISOString().split("T")[0],
          end: range.to.toISOString().split("T")[0],
        });
        setIsOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (value.start && value.end) {
      const start = new Date(value.start);
      const end = new Date(value.end);
      return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
    }
    return "Select date range";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          {presetRanges.map((preset) => (
            <SelectItem key={preset.label} value={preset.label}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-64 justify-start text-left font-normal",
              !value.start && !value.end && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedRange.from}
            selected={selectedRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
