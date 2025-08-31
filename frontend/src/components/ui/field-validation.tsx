"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface FieldValidationProps {
  children: ReactNode;
  error?: string;
  isValid?: boolean;
  isValidating?: boolean;
  showValidation?: boolean;
  className?: string;
}

export function FieldValidation({
  children,
  error,
  isValid,
  isValidating,
  showValidation = true,
  className,
}: FieldValidationProps) {
  const hasError = !!error;
  const showSuccess = showValidation && isValid && !hasError && !isValidating;
  const showError = showValidation && hasError && !isValidating;
  const showLoading = isValidating;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        {children}

        {/* Validation icon */}
        {(showSuccess || showError || showLoading) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {showLoading && (
              <AlertCircle className="h-4 w-4 text-muted-foreground animate-pulse" />
            )}
            {showSuccess && <CheckCircle className="h-4 w-4 text-green-600" />}
            {showError && <XCircle className="h-4 w-4 text-red-600" />}
          </div>
        )}
      </div>

      {/* Error message */}
      {showError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

interface ValidationMessageProps {
  type: "error" | "success" | "warning";
  message: string;
  className?: string;
}

export function ValidationMessage({
  type,
  message,
  className,
}: ValidationMessageProps) {
  const icons = {
    error: XCircle,
    success: CheckCircle,
    warning: AlertCircle,
  };

  const colors = {
    error: "text-red-600",
    success: "text-green-600",
    warning: "text-yellow-600",
  };

  const Icon = icons[type];

  return (
    <p
      className={cn("text-sm flex items-center gap-1", colors[type], className)}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  );
}
