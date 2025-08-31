"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  AuthErrorMessage,
  ValidationErrorMessage,
} from "@/components/ui/error-message";
import { FieldValidation } from "@/components/ui/field-validation";
import { PasswordStrength } from "@/components/ui/password-strength";
import { useAuth } from "@/hooks/use-auth";
import {
  useEmailValidation,
  usePasswordValidation,
  useFieldValidation,
} from "@/hooks/use-field-validation";
import { registerSchema, RegisterFormData } from "@/lib/auth-schemas";
import { ErrorHandler } from "@/lib/error-handler";

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);
  const { register: registerUser, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    setError,
    clearErrors,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange", // Enable real-time validation
  });

  // Watch form values for real-time validation
  const watchedValues = watch();
  const { firstName, lastName, email, password, confirmPassword, companyName } =
    watchedValues;

  // Real-time field validation
  const emailValidation = useEmailValidation(email);
  const passwordValidation = usePasswordValidation(password);
  const firstNameValidation = useFieldValidation(firstName, {
    schema: registerSchema,
    fieldName: "firstName",
  });
  const lastNameValidation = useFieldValidation(lastName, {
    schema: registerSchema,
    fieldName: "lastName",
  });
  const companyNameValidation = useFieldValidation(companyName, {
    schema: registerSchema,
    fieldName: "companyName",
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setSubmitError(null);
      clearErrors();
      await registerUser(data);
      onSuccess?.();
    } catch (error) {
      const errorInfo = ErrorHandler.handleError(error);
      setSubmitError(error instanceof Error ? error : new Error(String(error)));

      // Set specific field errors for validation issues
      if (error instanceof Error) {
        if (
          error.message.includes("email") ||
          errorInfo.title.includes("Email")
        ) {
          setError("email", {
            message: errorInfo.message,
          });
        } else if (error.message.includes("password")) {
          setError("password", {
            message: errorInfo.message,
          });
        }
      }
    }
  };

  const handleRetry = () => {
    setSubmitError(null);
    clearErrors();
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground">
            Sign up to get started with our ATS platform
          </p>
        </div>

        {submitError && (
          <AuthErrorMessage
            type="registration-failed"
            onRetry={handleRetry}
            className="mb-4"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <FieldValidation
                error={errors.firstName?.message}
                isValid={firstNameValidation.isValid && touchedFields.firstName}
                isValidating={firstNameValidation.isValidating}
                showValidation={touchedFields.firstName}
              >
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register("firstName")}
                  onBlur={firstNameValidation.onBlur}
                  disabled={isLoading}
                  className={
                    touchedFields.firstName && errors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : touchedFields.firstName && firstNameValidation.isValid
                        ? "border-green-500 focus:border-green-500"
                        : ""
                  }
                />
              </FieldValidation>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <FieldValidation
                error={errors.lastName?.message}
                isValid={lastNameValidation.isValid && touchedFields.lastName}
                isValidating={lastNameValidation.isValidating}
                showValidation={touchedFields.lastName}
              >
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register("lastName")}
                  onBlur={lastNameValidation.onBlur}
                  disabled={isLoading}
                  className={
                    touchedFields.lastName && errors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : touchedFields.lastName && lastNameValidation.isValid
                        ? "border-green-500 focus:border-green-500"
                        : ""
                  }
                />
              </FieldValidation>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <FieldValidation
              error={errors.email?.message || emailValidation.error}
              isValid={emailValidation.isValid && touchedFields.email}
              isValidating={emailValidation.isValidating}
              showValidation={touchedFields.email}
            >
              <Input
                id="email"
                type="email"
                placeholder="john.doe@company.com"
                {...register("email")}
                onBlur={emailValidation.onBlur}
                disabled={isLoading}
                className={
                  touchedFields.email && (errors.email || emailValidation.error)
                    ? "border-red-500 focus:border-red-500"
                    : touchedFields.email && emailValidation.isValid
                      ? "border-green-500 focus:border-green-500"
                      : ""
                }
              />
            </FieldValidation>
            {emailValidation.suggestions &&
              emailValidation.suggestions.length > 0 && (
                <div className="space-y-1">
                  {emailValidation.suggestions.map((suggestion, index) => (
                    <p key={index} className="text-xs text-blue-600">
                      💡 {suggestion}
                    </p>
                  ))}
                </div>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <FieldValidation
              error={errors.companyName?.message}
              isValid={
                companyNameValidation.isValid && touchedFields.companyName
              }
              isValidating={companyNameValidation.isValidating}
              showValidation={touchedFields.companyName}
            >
              <Input
                id="companyName"
                placeholder="Your Company"
                {...register("companyName")}
                onBlur={companyNameValidation.onBlur}
                disabled={isLoading}
                className={
                  touchedFields.companyName && errors.companyName
                    ? "border-red-500 focus:border-red-500"
                    : touchedFields.companyName && companyNameValidation.isValid
                      ? "border-green-500 focus:border-green-500"
                      : ""
                }
              />
            </FieldValidation>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register("role")}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select your role</option>
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring Manager</option>
            </select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <FieldValidation
              error={errors.password?.message || passwordValidation.error}
              isValid={passwordValidation.isValid && touchedFields.password}
              isValidating={passwordValidation.isValidating}
              showValidation={touchedFields.password}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  {...register("password")}
                  onBlur={passwordValidation.onBlur}
                  disabled={isLoading}
                  className={
                    touchedFields.password &&
                    (errors.password || passwordValidation.error)
                      ? "border-red-500 focus:border-red-500"
                      : touchedFields.password && passwordValidation.isValid
                        ? "border-green-500 focus:border-green-500"
                        : ""
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </FieldValidation>

            {/* Password strength indicator */}
            {password && touchedFields.password && (
              <PasswordStrength password={password} className="mt-2" />
            )}

            {/* Password suggestions */}
            {passwordValidation.suggestions &&
              passwordValidation.suggestions.length > 0 && (
                <div className="space-y-1">
                  {passwordValidation.suggestions.map((suggestion, index) => (
                    <p key={index} className="text-xs text-blue-600">
                      💡 {suggestion}
                    </p>
                  ))}
                </div>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <FieldValidation
              error={errors.confirmPassword?.message}
              isValid={
                touchedFields.confirmPassword &&
                confirmPassword === password &&
                password &&
                !errors.confirmPassword
              }
              showValidation={touchedFields.confirmPassword}
            >
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                  disabled={isLoading}
                  className={
                    touchedFields.confirmPassword && errors.confirmPassword
                      ? "border-red-500 focus:border-red-500"
                      : touchedFields.confirmPassword &&
                          confirmPassword === password &&
                          password
                        ? "border-green-500 focus:border-green-500"
                        : ""
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </FieldValidation>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>

        {onSwitchToLogin && (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Button
              variant="link"
              onClick={onSwitchToLogin}
              disabled={isLoading}
              className="p-0 h-auto font-normal"
            >
              Sign in
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
