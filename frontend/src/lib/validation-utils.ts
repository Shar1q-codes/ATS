import { z } from "zod";

// Enhanced email validation with more comprehensive checks
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
} {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }

  // Check if email starts with @
  if (email.startsWith("@")) {
    return { isValid: false, error: "Email cannot start with @" };
  }

  // More specific validations before basic format check
  const parts = email.split("@");
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
      suggestions: [
        "Make sure your email includes @ and a domain (e.g., user@company.com)",
      ],
    };
  }

  const [localPart, domain] = parts;

  // Local part validation
  if (localPart.length === 0) {
    return { isValid: false, error: "Email cannot start with @" };
  }

  if (localPart.length > 64) {
    return { isValid: false, error: "Email username is too long" };
  }

  // Domain validation
  if (domain.length === 0) {
    return { isValid: false, error: "Email must include a domain" };
  }

  if (!domain.includes(".")) {
    return {
      isValid: false,
      error: "Email domain must include a top-level domain",
      suggestions: ["Add a domain extension like .com, .org, or .net"],
    };
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
      suggestions: [
        "Make sure your email includes @ and a domain (e.g., user@company.com)",
      ],
    };
  }

  // Check for common typos in popular domains
  const commonDomains = {
    "gmail.co": "gmail.com",
    "gmail.cm": "gmail.com",
    "gmial.com": "gmail.com",
    "yahoo.co": "yahoo.com",
    "yahoo.cm": "yahoo.com",
    "hotmail.co": "hotmail.com",
    "hotmail.cm": "hotmail.com",
    "outlook.co": "outlook.com",
    "outlook.cm": "outlook.com",
  };

  const suggestion =
    commonDomains[domain.toLowerCase() as keyof typeof commonDomains];
  if (suggestion) {
    return {
      isValid: false,
      error: "Did you mean a different domain?",
      suggestions: [`Did you mean ${localPart}@${suggestion}?`],
    };
  }

  return { isValid: true };
}

// Real-time field validation
export function createFieldValidator<T>(
  schema: z.ZodSchema<T>,
  fieldName: keyof T
) {
  return (value: any): { isValid: boolean; error?: string } => {
    try {
      const result = schema
        .pick({ [fieldName]: true } as unknown)
        .parse({ [fieldName]: value });
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find((e) =>
          e.path.includes(fieldName as string)
        );
        return {
          isValid: false,
          error: fieldError?.message || "Invalid value",
        };
      }
      return { isValid: false, error: "Validation error" };
    }
  };
}

// Debounced validation hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Import React for the hook
import React from "react";

// Validation states for form fields
export type ValidationState = {
  isValid: boolean;
  error?: string;
  isValidating?: boolean;
  suggestions?: string[];
};

// Create a validation state manager
export function createValidationState(): ValidationState {
  return {
    isValid: false,
    isValidating: false,
  };
}

// Common validation patterns
export const validationPatterns = {
  name: /^[a-zA-Z\s'-]{2,50}$/,
  strongPassword:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
  mediumPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  companyName: /^[a-zA-Z0-9\s&.,'-]{2,100}$/,
} as const;

// Validation messages
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must be less than ${max} characters`,
  pattern: (field: string) => `Please enter a valid ${field.toLowerCase()}`,
  email: "Please enter a valid email address",
  passwordMatch: "Passwords don't match",
  passwordStrength: "Password must contain uppercase, lowercase, and numbers",
} as const;
