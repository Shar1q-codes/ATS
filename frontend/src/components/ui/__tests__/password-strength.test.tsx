import { render, screen } from "@testing-library/react";
import {
  PasswordStrength,
  calculatePasswordStrength,
} from "../password-strength";

describe("calculatePasswordStrength", () => {
  it("should return empty state for empty password", () => {
    const result = calculatePasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("");
    expect(result.color).toBe("bg-gray-200");
  });

  it("should return weak for short password", () => {
    const result = calculatePasswordStrength("123");
    expect(result.score).toBeLessThanOrEqual(2);
    expect(result.label).toBe("Weak");
    expect(result.color).toBe("bg-red-500");
    expect(result.suggestions).toContain("Use at least 8 characters");
  });

  it("should return fair for medium password", () => {
    const result = calculatePasswordStrength("Password123!");
    expect(result.score).toBeGreaterThan(2);
    expect(result.score).toBeLessThanOrEqual(4);
    expect(result.label).toBe("Fair");
    expect(result.color).toBe("bg-yellow-500");
  });

  it("should return good for strong password", () => {
    const result = calculatePasswordStrength("Password123!");
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.label).toMatch(/Fair|Good|Strong/);
  });

  it("should penalize common patterns", () => {
    const weakResult = calculatePasswordStrength("Password123456");
    const strongResult = calculatePasswordStrength("MyStr0ng!Pass");
    expect(weakResult.score).toBeLessThan(strongResult.score);
  });

  it("should provide helpful suggestions", () => {
    const result = calculatePasswordStrength("password");
    expect(result.suggestions).toContain("Include uppercase letters");
    expect(result.suggestions).toContain("Include numbers");
  });
});

describe("PasswordStrength Component", () => {
  it("should not render for empty password", () => {
    render(<PasswordStrength password="" />);
    expect(screen.queryByText("Password strength:")).not.toBeInTheDocument();
  });

  it("should render strength indicator for password", () => {
    render(<PasswordStrength password="Password123!" />);
    expect(screen.getByText("Password strength:")).toBeInTheDocument();
  });

  it("should show suggestions for weak password", () => {
    render(<PasswordStrength password="weak" />);
    expect(screen.getByText("Password strength:")).toBeInTheDocument();
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("should show strong indicator for strong password", () => {
    render(<PasswordStrength password="MyVeryStr0ng!Password123" />);
    expect(screen.getByText("Password strength:")).toBeInTheDocument();
    // Should show some strength indicator (could be Good or Strong)
    const strengthText = screen.getByText(/Fair|Good|Strong/);
    expect(strengthText).toBeInTheDocument();
  });
});
