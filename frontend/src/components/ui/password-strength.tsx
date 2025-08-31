"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push("Use at least 8 characters");
  }

  if (password.length >= 12) {
    score += 1;
  } else if (password.length >= 8) {
    suggestions.push("Consider using 12+ characters for better security");
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push("Include lowercase letters");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push("Include uppercase letters");
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push("Include numbers");
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push("Include special characters (!@#$%^&*)");
  }

  // Common patterns to avoid
  if (password.length > 0) {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /(.)\1{2,}/, // Repeated characters
    ];

    const hasCommonPattern = commonPatterns.some((pattern) =>
      pattern.test(password)
    );

    if (hasCommonPattern) {
      score = Math.max(0, score - 2);
      suggestions.push("Avoid common patterns and repeated characters");
    }
  }

  // Determine strength level
  let label: string;
  let color: string;

  if (score === 0) {
    label = "";
    color = "bg-gray-200";
  } else if (score <= 2) {
    label = "Weak";
    color = "bg-red-500";
  } else if (score <= 4) {
    label = "Fair";
    color = "bg-yellow-500";
  } else if (score <= 5) {
    label = "Good";
    color = "bg-blue-500";
  } else {
    label = "Strong";
    color = "bg-green-500";
  }

  return {
    score: Math.min(score, 6),
    label,
    color,
    suggestions: suggestions.slice(0, 3), // Limit to 3 most important suggestions
  };
}

export function PasswordStrength({
  password,
  className,
}: PasswordStrengthProps) {
  const strength = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  if (!password) {
    return null;
  }

  const strengthPercentage = (strength.score / 6) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        {strength.label && (
          <span
            className={cn(
              "font-medium",
              strength.score <= 2 && "text-red-600",
              strength.score > 2 && strength.score <= 4 && "text-yellow-600",
              strength.score > 4 && strength.score <= 5 && "text-blue-600",
              strength.score > 5 && "text-green-600"
            )}
          >
            {strength.label}
          </span>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            strength.color
          )}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>

      {strength.suggestions.length > 0 && (
        <div className="space-y-1">
          {strength.suggestions.map((suggestion, index) => (
            <p key={index} className="text-xs text-muted-foreground">
              • {suggestion}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
