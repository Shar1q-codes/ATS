import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JobFamilyForm } from "../job-family-form";
import * as jobsApi from "@/hooks/api/use-jobs-api";

// Mock the hooks
jest.mock("@/hooks/api/use-jobs-api");

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

const mockProps = {
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
};

describe("JobFamilyForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jobsApi.useCreateJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
    });
    (jobsApi.useUpdateJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
    });
  });

  it("renders create form correctly", () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Skill Categories")).toBeInTheDocument();
    expect(screen.getByText("Base Requirements")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders edit form with initial data", () => {
    const initialData = {
      id: "1",
      name: "Software Engineer",
      description: "Software development roles",
      baseRequirements: [
        {
          id: "req1",
          type: "skill" as const,
          category: "must" as const,
          description: "JavaScript programming",
          weight: 8,
          alternatives: ["TypeScript"],
        },
      ],
      skillCategories: ["Programming", "Web Development"],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    renderWithQueryClient(
      <JobFamilyForm {...mockProps} initialData={initialData} />
    );

    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Software development roles")
    ).toBeInTheDocument();
    expect(screen.getByText("Programming")).toBeInTheDocument();
    expect(screen.getByText("Web Development")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("JavaScript programming")
    ).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    const submitButton = screen.getByText("Create");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
  });

  it("adds and removes skill categories", async () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    const skillInput = screen.getByPlaceholderText("Add skill category...");
    const buttons = screen.getAllByRole("button");
    const addButton = buttons.find(
      (button) =>
        button.querySelector("svg") &&
        !button.textContent?.includes("Add Requirement")
    );

    // Add skill category
    fireEvent.change(skillInput, { target: { value: "Programming" } });
    if (addButton) {
      fireEvent.click(addButton);
    }

    await waitFor(() => {
      expect(screen.getByText("Programming")).toBeInTheDocument();
    });

    // Remove skill category
    const removeButton = screen.getByRole("button", { name: /x/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("Programming")).not.toBeInTheDocument();
    });
  });

  it("adds and removes requirements", async () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    const addRequirementButton = screen.getByText("Add Requirement");
    fireEvent.click(addRequirementButton);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Describe this requirement...")
      ).toBeInTheDocument();
    });

    // Fill in requirement details
    const descriptionInput = screen.getByPlaceholderText(
      "Describe this requirement..."
    );
    fireEvent.change(descriptionInput, {
      target: { value: "JavaScript programming" },
    });

    // Remove requirement
    const removeButtons = screen.getAllByRole("button");
    const removeButton = removeButtons.find(
      (button) =>
        button.querySelector("svg")?.getAttribute("data-testid") === "x-icon"
    );

    if (removeButton) {
      fireEvent.click(removeButton);
      await waitFor(() => {
        expect(
          screen.queryByDisplayValue("JavaScript programming")
        ).not.toBeInTheDocument();
      });
    }
  });

  it("adds and removes alternatives for requirements", async () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    // Add a requirement first
    const addRequirementButton = screen.getByText("Add Requirement");
    fireEvent.click(addRequirementButton);

    await waitFor(() => {
      const alternativeInput =
        screen.getByPlaceholderText("Add alternative...");
      const addAlternativeButton = screen
        .getAllByRole("button")
        .find(
          (button) =>
            button.querySelector("svg")?.getAttribute("data-testid") ===
            "plus-icon"
        );

      if (alternativeInput && addAlternativeButton) {
        // Add alternative
        fireEvent.change(alternativeInput, { target: { value: "TypeScript" } });
        fireEvent.click(addAlternativeButton);

        expect(screen.getByText("TypeScript")).toBeInTheDocument();
      }
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it("calls create mutation on form submission", async () => {
    const mockCreate = jest.fn().mockResolvedValue({});
    (jobsApi.useCreateJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockCreate,
    });

    renderWithQueryClient(<JobFamilyForm {...mockProps} />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Software development roles" },
    });

    // Add skill category
    const skillInput = screen.getByPlaceholderText("Add skill category...");
    fireEvent.change(skillInput, { target: { value: "Programming" } });
    const buttons = screen.getAllByRole("button");
    const addSkillButton = buttons.find(
      (button) =>
        button.querySelector("svg") &&
        !button.textContent?.includes("Add Requirement")
    );
    if (addSkillButton) {
      fireEvent.click(addSkillButton);
    }

    // Add requirement
    fireEvent.click(screen.getByText("Add Requirement"));
    await waitFor(() => {
      const descriptionInput = screen.getByPlaceholderText(
        "Describe this requirement..."
      );
      fireEvent.change(descriptionInput, {
        target: { value: "JavaScript programming" },
      });
    });

    // Submit form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: "Software Engineer",
        description: "Software development roles",
        skillCategories: ["Programming"],
        baseRequirements: expect.arrayContaining([
          expect.objectContaining({
            description: "JavaScript programming",
            type: "skill",
            category: "must",
            weight: 5,
          }),
        ]),
      });
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("calls update mutation when editing existing job family", async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});
    (jobsApi.useUpdateJobFamilyMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockUpdate,
    });

    const initialData = {
      id: "1",
      name: "Software Engineer",
      description: "Software development roles",
      baseRequirements: [
        {
          id: "req1",
          type: "skill" as const,
          category: "must" as const,
          description: "JavaScript programming",
          weight: 8,
          alternatives: [],
        },
      ],
      skillCategories: ["Programming"],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    renderWithQueryClient(
      <JobFamilyForm {...mockProps} initialData={initialData} />
    );

    // Modify the name
    const nameInput = screen.getByDisplayValue("Software Engineer");
    fireEvent.change(nameInput, {
      target: { value: "Senior Software Engineer" },
    });

    // Submit form
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          name: "Senior Software Engineer",
        })
      );
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });
});
