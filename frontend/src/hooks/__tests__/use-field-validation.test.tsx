import { renderHook, act } from "@testing-library/react";
import {
  useFieldValidation,
  useEmailValidation,
  usePasswordValidation,
} from "../use-field-validation";
import { z } from "zod";

// Mock the validation utils
jest.mock("../validation-utils", () => ({
  validateEmail: jest.fn((email: string) => {
    if (!email) return { isValid: false, error: "Email is required" };
    if (!email.includes("@"))
      return { isValid: false, error: "Invalid email format" };
    return { isValid: true };
  }),
}));

describe("useFieldValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useFieldValidation(""));

    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.hasBlurred).toBe(false);
  });

  it("should validate with schema", async () => {
    const schema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
    });

    const { result } = renderHook(() =>
      useFieldValidation("John", {
        schema,
        fieldName: "name",
        validateOnChange: true,
      })
    );

    // Wait for validation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350)); // Wait for debounce
    });

    expect(result.current.isValid).toBe(true);
  });

  it("should show error for invalid value", async () => {
    const schema = z.object({
      name: z.string().min(2, "Name must be at least 2 characters"),
    });

    const { result } = renderHook(() =>
      useFieldValidation("A", {
        schema,
        fieldName: "name",
        validateOnChange: true,
      })
    );

    // Wait for validation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe("Name must be at least 2 characters");
  });

  it("should handle blur event", () => {
    const { result } = renderHook(() => useFieldValidation("test"));

    act(() => {
      result.current.onBlur();
    });

    expect(result.current.hasBlurred).toBe(true);
  });

  it("should reset validation state", () => {
    const { result } = renderHook(() => useFieldValidation("test"));

    act(() => {
      result.current.onBlur();
    });

    expect(result.current.hasBlurred).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.hasBlurred).toBe(false);
    expect(result.current.isValid).toBe(false);
    expect(result.current.isValidating).toBe(false);
  });
});

describe("useEmailValidation", () => {
  it("should validate email correctly", async () => {
    const { result } = renderHook(() => useEmailValidation("test@example.com"));

    // Wait for validation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550)); // Wait for email debounce
    });

    expect(result.current.isValid).toBe(true);
  });

  it("should show error for invalid email", async () => {
    const { result } = renderHook(() => useEmailValidation("invalid-email"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe("Invalid email format");
  });
});

describe("usePasswordValidation", () => {
  it("should validate strong password", async () => {
    const { result } = renderHook(() =>
      usePasswordValidation("StrongPass123!")
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.isValid).toBe(true);
  });

  it("should show error for weak password", async () => {
    const { result } = renderHook(() => usePasswordValidation("weak"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe("Password must be at least 8 characters");
  });

  it("should provide suggestions for password improvement", async () => {
    const { result } = renderHook(() => usePasswordValidation("password"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.suggestions).toContain("Include uppercase letters");
  });
});
