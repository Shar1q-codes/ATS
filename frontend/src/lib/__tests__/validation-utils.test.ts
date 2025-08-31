import { validateEmail, validationPatterns } from "../validation-utils";

describe("validateEmail", () => {
  it("should return invalid for empty email", () => {
    const result = validateEmail("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email is required");
  });

  it("should return invalid for malformed email", () => {
    const result = validateEmail("invalid-email");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Please enter a valid email address");
    expect(result.suggestions).toContain(
      "Make sure your email includes @ and a domain (e.g., user@company.com)"
    );
  });

  it("should return valid for correct email", () => {
    const result = validateEmail("user@example.com");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should detect common domain typos", () => {
    const result = validateEmail("user@gmail.co");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Did you mean a different domain?");
    expect(result.suggestions).toContain("Did you mean user@gmail.com?");
  });

  it("should return invalid for email without domain", () => {
    const result = validateEmail("user@");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email must include a domain");
  });

  it("should return invalid for email without TLD", () => {
    const result = validateEmail("user@domain");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email domain must include a top-level domain");
    expect(result.suggestions).toContain(
      "Add a domain extension like .com, .org, or .net"
    );
  });

  it("should return invalid for email starting with @", () => {
    const result = validateEmail("@domain.com");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email cannot start with @");
  });

  it("should handle long local part", () => {
    const longLocalPart = "a".repeat(65);
    const result = validateEmail(`${longLocalPart}@domain.com`);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Email username is too long");
  });
});

describe("validationPatterns", () => {
  it("should validate names correctly", () => {
    expect(validationPatterns.name.test("John Doe")).toBe(true);
    expect(validationPatterns.name.test("Mary-Jane")).toBe(true);
    expect(validationPatterns.name.test("O'Connor")).toBe(true);
    expect(validationPatterns.name.test("John123")).toBe(false);
    expect(validationPatterns.name.test("")).toBe(false);
    expect(validationPatterns.name.test("A")).toBe(false); // Too short
  });

  it("should validate strong passwords correctly", () => {
    expect(validationPatterns.strongPassword.test("Password123!")).toBe(true);
    expect(validationPatterns.strongPassword.test("MyStr0ng@Pass")).toBe(true);
    expect(validationPatterns.strongPassword.test("password123")).toBe(false); // No special char
    expect(validationPatterns.strongPassword.test("PASSWORD123!")).toBe(false); // No lowercase
    expect(validationPatterns.strongPassword.test("Password!")).toBe(false); // No number
  });

  it("should validate medium passwords correctly", () => {
    expect(validationPatterns.mediumPassword.test("Password123")).toBe(true);
    expect(validationPatterns.mediumPassword.test("MyStr0ngPass")).toBe(true);
    expect(validationPatterns.mediumPassword.test("password123")).toBe(false); // No uppercase
    expect(validationPatterns.mediumPassword.test("PASSWORD123")).toBe(false); // No lowercase
    expect(validationPatterns.mediumPassword.test("Password")).toBe(false); // No number
  });

  it("should validate company names correctly", () => {
    expect(validationPatterns.companyName.test("Acme Corp")).toBe(true);
    expect(validationPatterns.companyName.test("Smith & Associates")).toBe(
      true
    );
    expect(validationPatterns.companyName.test("Tech Co., Ltd.")).toBe(true);
    expect(validationPatterns.companyName.test("O'Reilly Media")).toBe(true);
    expect(validationPatterns.companyName.test("Company@#$")).toBe(false); // Invalid chars
    expect(validationPatterns.companyName.test("A")).toBe(false); // Too short
  });
});
