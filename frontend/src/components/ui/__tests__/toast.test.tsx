import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, useToast } from "@/hooks/use-toast";
import { Toaster } from "../toaster";

// Test component that uses the toast hook
function TestComponent() {
  const { toast, success, error, warning, info } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          toast({
            title: "Test Toast",
            description: "This is a test toast",
          })
        }
      >
        Show Toast
      </button>
      <button onClick={() => success("Success message")}>Show Success</button>
      <button onClick={() => error("Error message")}>Show Error</button>
      <button onClick={() => warning("Warning message")}>Show Warning</button>
      <button onClick={() => info("Info message")}>Show Info</button>
    </div>
  );
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>
  );
}

describe("Toast System", () => {
  it("should display toast notifications", async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const showToastButton = screen.getByText("Show Toast");
    fireEvent.click(showToastButton);

    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeInTheDocument();
      expect(screen.getByText("This is a test toast")).toBeInTheDocument();
    });
  });

  it("should display success toast", async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const successButton = screen.getByText("Show Success");
    fireEvent.click(successButton);

    await waitFor(() => {
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });
  });

  it("should display error toast", async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const errorButton = screen.getByText("Show Error");
    fireEvent.click(errorButton);

    await waitFor(() => {
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });
  });

  it("should auto-remove toasts after duration", async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const showToastButton = screen.getByText("Show Toast");
    fireEvent.click(showToastButton);

    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });

    // Wait for toast to auto-remove (default 5 seconds)
    await waitFor(
      () => {
        expect(screen.queryByText("Test Toast")).not.toBeInTheDocument();
      },
      { timeout: 6000 }
    );
  }, 10000); // Increase test timeout to 10 seconds

  it("should allow manual toast removal", async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const showToastButton = screen.getByText("Show Toast");
    fireEvent.click(showToastButton);

    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeInTheDocument();
    });

    // Find and click the close button (X icon)
    const closeButtons = screen.getAllByRole("button");
    const closeButton = closeButtons.find((button) =>
      button.querySelector("svg.lucide-x")
    );
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText("Test Toast")).not.toBeInTheDocument();
    });
  });
});
