import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangePicker } from "../date-range-picker";

describe("DateRangePicker", () => {
  const mockOnChange = jest.fn();
  const defaultDateRange = {
    start: "2024-01-01",
    end: "2024-01-31",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders date range picker with default values", () => {
    render(
      <DateRangePicker value={defaultDateRange} onChange={mockOnChange} />
    );

    expect(screen.getByText("Quick select")).toBeInTheDocument();
    expect(screen.getByText(/Jan 01, 2024 - Jan 31, 2024/)).toBeInTheDocument();
  });

  it("shows preset options when dropdown is opened", () => {
    render(
      <DateRangePicker value={defaultDateRange} onChange={mockOnChange} />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    expect(screen.getByText("Last 6 months")).toBeInTheDocument();
    expect(screen.getByText("Last year")).toBeInTheDocument();
  });

  it("calls onChange when preset is selected", () => {
    render(
      <DateRangePicker value={defaultDateRange} onChange={mockOnChange} />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    const last7DaysOption = screen.getByText("Last 7 days");
    fireEvent.click(last7DaysOption);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(String),
        end: expect.any(String),
      })
    );
  });

  it("opens calendar when date button is clicked", () => {
    render(
      <DateRangePicker value={defaultDateRange} onChange={mockOnChange} />
    );

    const dateButton = screen.getByRole("button", {
      name: /Jan 01, 2024 - Jan 31, 2024/,
    });
    fireEvent.click(dateButton);

    // Calendar should be visible (though we can't easily test the calendar content)
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays placeholder text when no date range is selected", () => {
    render(
      <DateRangePicker value={{ start: "", end: "" }} onChange={mockOnChange} />
    );

    expect(screen.getByText("Select date range")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DateRangePicker
        value={defaultDateRange}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("generates correct date ranges for presets", () => {
    render(
      <DateRangePicker value={defaultDateRange} onChange={mockOnChange} />
    );

    const selectTrigger = screen.getByRole("combobox");
    fireEvent.click(selectTrigger);

    const last30DaysOption = screen.getByText("Last 30 days");
    fireEvent.click(last30DaysOption);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );

    // Verify the date range is approximately 30 days
    const call = mockOnChange.mock.calls[0][0];
    const startDate = new Date(call.start);
    const endDate = new Date(call.end);
    const daysDiff = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBeCloseTo(30, 1);
  });
});
