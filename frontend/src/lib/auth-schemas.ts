import { z } from "zod";

// Enhanced email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .refine((email) => {
    // Additional email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }, "Please enter a valid email address")
  .refine((email) => {
    // Check email length
    return email.length <= 254;
  }, "Email address is too long")
  .refine((email) => {
    // Check for common typos
    const domain = email.split("@")[1]?.toLowerCase();
    const suspiciousDomains = ["gmail.co", "gmail.cm", "yahoo.co", "yahoo.cm"];
    return !suspiciousDomains.includes(domain);
  }, "Please check your email domain for typos");

// Enhanced name validation
const nameSchema = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .min(2, `${fieldName} must be at least 2 characters`)
    .max(50, `${fieldName} must be less than 50 characters`)
    .regex(
      /^[a-zA-Z\s'-]+$/,
      `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
    )
    .refine((name) => {
      // Check for reasonable name patterns
      return name.trim().length >= 2 && !/^\s|\s$/.test(name);
    }, `${fieldName} cannot start or end with spaces`);

// Enhanced password validation
const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
  .regex(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
  .regex(/^(?=.*\d)/, "Password must contain at least one number")
  .refine((password) => {
    // Check for common weak patterns
    const weakPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /(.)\1{3,}/, // 4 or more repeated characters
    ];
    return !weakPatterns.some((pattern) => pattern.test(password));
  }, "Password contains common patterns that make it weak");

// Enhanced company name validation
const companyNameSchema = z
  .string()
  .min(1, "Company name is required")
  .min(2, "Company name must be at least 2 characters")
  .max(100, "Company name must be less than 100 characters")
  .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Company name contains invalid characters")
  .refine((name) => {
    return name.trim().length >= 2 && !/^\s|\s$/.test(name);
  }, "Company name cannot start or end with spaces");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    firstName: nameSchema("First name"),
    lastName: nameSchema("Last name"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["recruiter", "hiring_manager"], {
      required_error: "Please select a role",
    }),
    companyName: companyNameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
