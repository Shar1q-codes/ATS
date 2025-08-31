"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { validateEmail } from "@/lib/validation-utils";

interface ValidationState {
  isValid: boolean;
  error?: string;
  isValidating: boolean;
  suggestions?: string[];
}

interface UseFieldValidationOptions {
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  schema?: z.ZodSchema<any>;
  fieldName?: string;
  customValidator?: (value: any) => Promise<ValidationState> | ValidationState;
}

export function useFieldValidation(
  value: any,
  options: UseFieldValidationOptions = {}
) {
  const {
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    schema,
    fieldName,
    customValidator,
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: false,
    isValidating: false,
  });

  const [hasBlurred, setHasBlurred] = useState(false);

  const validate = useCallback(
    async (valueToValidate: any, immediate = false) => {
      if (!valueToValidate && !immediate) {
        setValidationState({
          isValid: false,
          isValidating: false,
        });
        return;
      }

      setValidationState((prev) => ({ ...prev, isValidating: true }));

      try {
        let result: ValidationState;

        if (customValidator) {
          result = await customValidator(valueToValidate);
        } else if (schema && fieldName) {
          try {
            schema
              .pick({ [fieldName]: true } as any)
              .parse({ [fieldName]: valueToValidate });
            result = { isValid: true, isValidating: false };
          } catch (error) {
            if (error instanceof z.ZodError) {
              const fieldError = error.errors.find((e) =>
                e.path.includes(fieldName)
              );
              result = {
                isValid: false,
                error: fieldError?.message || "Invalid value",
                isValidating: false,
              };
            } else {
              result = {
                isValid: false,
                error: "Validation error",
                isValidating: false,
              };
            }
          }
        } else {
          // Default validation
          result = {
            isValid: !!valueToValidate,
            isValidating: false,
          };
        }

        setValidationState(result);
      } catch (error) {
        setValidationState({
          isValid: false,
          error: "Validation failed",
          isValidating: false,
        });
      }
    },
    [schema, fieldName, customValidator]
  );

  // Debounced validation for onChange
  useEffect(() => {
    if (!validateOnChange || (!hasBlurred && !value)) return;

    const timeoutId = setTimeout(() => {
      validate(value);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, validate, debounceMs, validateOnChange, hasBlurred]);

  const handleBlur = useCallback(() => {
    setHasBlurred(true);
    if (validateOnBlur) {
      validate(value, true);
    }
  }, [validate, value, validateOnBlur]);

  const reset = useCallback(() => {
    setValidationState({
      isValid: false,
      isValidating: false,
    });
    setHasBlurred(false);
  }, []);

  return {
    ...validationState,
    hasBlurred,
    onBlur: handleBlur,
    reset,
    validate: (val?: any) => validate(val ?? value, true),
  };
}

// Specialized hook for email validation
export function useEmailValidation(email: string) {
  return useFieldValidation(email, {
    customValidator: async (value: string) => {
      if (!value) {
        return { isValid: false, isValidating: false };
      }

      const result = validateEmail(value);
      return {
        isValid: result.isValid,
        error: result.error,
        suggestions: result.suggestions,
        isValidating: false,
      };
    },
    debounceMs: 500,
  });
}

// Hook for password validation with strength checking
export function usePasswordValidation(password: string) {
  return useFieldValidation(password, {
    customValidator: async (value: string) => {
      if (!value) {
        return { isValid: false, isValidating: false };
      }

      const errors: string[] = [];

      if (value.length < 8) {
        errors.push("Password must be at least 8 characters");
      }

      if (!/[a-z]/.test(value)) {
        errors.push("Include lowercase letters");
      }

      if (!/[A-Z]/.test(value)) {
        errors.push("Include uppercase letters");
      }

      if (!/\d/.test(value)) {
        errors.push("Include numbers");
      }

      // Check for weak patterns
      const weakPatterns = [
        /123456/,
        /password/i,
        /qwerty/i,
        /abc123/i,
        /(.)\1{3,}/,
      ];

      if (weakPatterns.some((pattern) => pattern.test(value))) {
        errors.push("Avoid common patterns");
      }

      return {
        isValid: errors.length === 0,
        error: errors[0],
        suggestions: errors.slice(1, 3),
        isValidating: false,
      };
    },
    debounceMs: 300,
  });
}
