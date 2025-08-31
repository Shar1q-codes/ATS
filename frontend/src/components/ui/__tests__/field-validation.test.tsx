import { render, screen } from "@testing-library/react";
import { FieldValidation, ValidationMessage } from "../field-validation";

describe("FieldValidation", () => {
  it("should render children", () => {
    render(
      <FieldValidation>
        <input data-testid="test-input" />
      </FieldValidation>
    );
    expect(screen.getByTestId("test-input")).toBeInTheDocument();
  });

  it("should show success icon when valid", () => {
    render(
      <FieldValidation isValid={true} showValidation={true}>
        <input data-testid="test-input" />
      </FieldValidation>
    );
    expect(screen.getByTestId("test-input")).toBeInTheDocument();
    // Success icon should be present (CheckCircle)
    const successIcon = document.querySelector(".text-green-600");
    expect(successIcon).toBeInTheDocument();
  });

  it("should show error message when invalid", () => {
    render(
      <FieldValidation error="This field is required" showValidation={true}>
        <input data-testid="test-input" />
      </FieldValidation>
    );
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    // Error icon should be present
    const errorIcon = document.querySelector(".text-red-600");
    expect(errorIcon).toBeInTheDocument();
  });

  it("should show loading state when validating", () => {
    render(
      <FieldValidation isValidating={true} showValidation={true}>
        <input data-testid="test-input" />
      </FieldValidation>
    );
    // Loading icon should be present (AlertCircle with animate-pulse)
    const loadingIcon = document.querySelector(".animate-pulse");
    expect(loadingIcon).toBeInTheDocument();
  });

  it("should not show validation when showValidation is false", () => {
    render(
      <FieldValidation error="This field is required" showValidation={false}>
        <input data-testid="test-input" />
      </FieldValidation>
    );
    expect(
      screen.queryByText("This field is required")
    ).not.toBeInTheDocument();
  });
});

describe("ValidationMessage", () => {
  it("should render error message with correct styling", () => {
    render(<ValidationMessage type="error" message="Error message" />);
    expect(screen.getByText("Error message")).toBeInTheDocument();
    const errorMessage = screen.getByText("Error message").closest("p");
    expect(errorMessage).toHaveClass("text-red-600");
  });

  it("should render success message with correct styling", () => {
    render(<ValidationMessage type="success" message="Success message" />);
    expect(screen.getByText("Success message")).toBeInTheDocument();
    const successMessage = screen.getByText("Success message").closest("p");
    expect(successMessage).toHaveClass("text-green-600");
  });

  it("should render warning message with correct styling", () => {
    render(<ValidationMessage type="warning" message="Warning message" />);
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    const warningMessage = screen.getByText("Warning message").closest("p");
    expect(warningMessage).toHaveClass("text-yellow-600");
  });
});
