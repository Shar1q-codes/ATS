import React, { ReactElement } from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/hooks/use-toast";

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface TestWrapperProps {
  children: React.ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => rtlRender(ui, { wrapper: TestWrapper, ...options });

// Re-export everything from testing library
export * from "@testing-library/react";
// Override render with our custom version
export { customRender as render };

// Mock data generators
export const mockUser = {
  id: "1",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "recruiter" as const,
};

export const mockCandidate = {
  id: "1",
  email: "candidate@example.com",
  firstName: "Jane",
  lastName: "Smith",
  phone: "+1234567890",
  location: "New York, NY",
  resumeUrl: "https://example.com/resume.pdf",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockJob = {
  id: "1",
  title: "Software Engineer",
  description: "We are looking for a software engineer...",
  requirements: ["JavaScript", "React", "Node.js"],
  location: "Remote",
  salaryRange: { min: 80000, max: 120000, currency: "USD" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockApplication = {
  id: "1",
  candidateId: "1",
  jobId: "1",
  status: "applied" as const,
  fitScore: 85,
  appliedAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
};

// Test helpers
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};
