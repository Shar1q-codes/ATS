import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateFilters } from "../candidate-filters";

const mockOnFiltersChange = jest.fn();

describe("CandidateFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic filter components", () => {
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search by name, email, or skills...")
    ).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("calls onFiltersChange when search input changes", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, or skills..."
    );
    await user.type(searchInput, "john");

    await waitFor(
      () => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          search: "john",
          sortBy: "createdAt",
          sortOrder: "desc",
        });
      },
      { timeout: 500 }
    );
  });

  it("shows advanced filters when Advanced button is clicked", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    const advancedButton = screen.getByText("Advanced");
    await user.click(advancedButton);

    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Min Experience (years)")).toBeInTheDocument();
    expect(screen.getByText("Max Experience (years)")).toBeInTheDocument();
  });

  it("adds and removes skills", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Show advanced filters
    await user.click(screen.getByText("Advanced"));

    // Add a skill
    const skillInput = screen.getByPlaceholderText("Add skill...");
    await user.type(skillInput, "JavaScript");
    await user.click(screen.getByText("Add"));

    expect(screen.getByText("JavaScript")).toBeInTheDocument();

    // Remove the skill by clicking the X in the badge
    const skillBadge = screen.getByText("JavaScript").closest("div");
    const removeButton = skillBadge?.querySelector("svg");
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(screen.queryByText("JavaScript")).not.toBeInTheDocument();
  });

  it("adds skill when Enter key is pressed", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Show advanced filters
    await user.click(screen.getByText("Advanced"));

    // Add a skill with Enter key
    const skillInput = screen.getByPlaceholderText("Add skill...");
    await user.type(skillInput, "React");
    await user.keyboard("{Enter}");

    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("prevents duplicate skills", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Show advanced filters
    await user.click(screen.getByText("Advanced"));

    // Add a skill twice
    const skillInput = screen.getByPlaceholderText("Add skill...");
    await user.type(skillInput, "Python");
    await user.click(screen.getByText("Add"));

    await user.type(skillInput, "Python");
    await user.click(screen.getByText("Add"));

    // Should only have one Python badge
    const pythonBadges = screen.getAllByText("Python");
    expect(pythonBadges).toHaveLength(1);
  });

  it("updates location filter", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Show advanced filters
    await user.click(screen.getByText("Advanced"));

    const locationInput = screen.getByPlaceholderText(
      "City, State, or Country"
    );
    await user.type(locationInput, "New York");

    await waitFor(
      () => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            location: "New York",
          })
        );
      },
      { timeout: 500 }
    );
  });

  it("updates experience range filters", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Show advanced filters
    await user.click(screen.getByText("Advanced"));

    const minExperienceInput = screen.getByPlaceholderText("0");
    const maxExperienceInput = screen.getByPlaceholderText("20");

    await user.type(minExperienceInput, "2");
    await user.type(maxExperienceInput, "5");

    await waitFor(
      () => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            experienceMin: 2,
            experienceMax: 5,
          })
        );
      },
      { timeout: 500 }
    );
  });

  it("updates sort options", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Change sort by
    const sortBySelect = screen.getByText("Date Added");
    await user.click(sortBySelect);
    await user.click(screen.getByText("First Name"));

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "firstName",
        })
      );
    });

    // Change sort order
    const sortOrderSelect = screen.getByText("Descending");
    await user.click(sortOrderSelect);
    await user.click(screen.getByText("Ascending"));

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: "asc",
        })
      );
    });
  });

  it("clears all filters", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Add some filters
    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, or skills..."
    );
    await user.type(searchInput, "test");

    // Show advanced filters and add more
    await user.click(screen.getByText("Advanced"));
    const locationInput = screen.getByPlaceholderText(
      "City, State, or Country"
    );
    await user.type(locationInput, "Boston");

    // Clear all filters
    await user.click(screen.getByText("Clear All"));

    expect(searchInput).toHaveValue("");
    expect(locationInput).toHaveValue("");
  });

  it("shows Clear All button only when filters are active", async () => {
    const user = userEvent.setup();
    render(<CandidateFilters onFiltersChange={mockOnFiltersChange} />);

    // Initially no Clear All button
    expect(screen.queryByText("Clear All")).not.toBeInTheDocument();

    // Add a filter
    const searchInput = screen.getByPlaceholderText(
      "Search by name, email, or skills..."
    );
    await user.type(searchInput, "test");

    // Now Clear All button should appear
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });
});
