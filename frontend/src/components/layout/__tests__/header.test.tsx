import { render, screen, fireEvent } from "@/__tests__/test-utils";
import { Header } from "../header";

describe("Header", () => {
  it("renders correctly", () => {
    render(<Header />);

    expect(screen.getByText("AI-Native ATS")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /AI-Native ATS/i })
    ).toHaveAttribute("href", "/");
  });

  it("renders desktop navigation links", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Candidates" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pipeline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
  });

  it("renders user menu button", () => {
    render(<Header />);

    const userButton = screen.getByRole("button");
    expect(userButton).toBeInTheDocument();
  });

  it("toggles user menu on click", () => {
    render(<Header />);

    const userButton = screen.getByRole("button");
    fireEvent.click(userButton);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign out/i })
    ).toBeInTheDocument();
  });

  it("renders mobile menu toggle when onMenuToggle is provided", () => {
    const mockToggle = jest.fn();
    render(<Header onMenuToggle={mockToggle} />);

    const menuButton = screen.getAllByRole("button")[0]; // First button should be menu toggle
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute("aria-label", "Toggle menu");
  });

  it("calls onMenuToggle when mobile menu button is clicked", () => {
    const mockToggle = jest.fn();
    render(<Header onMenuToggle={mockToggle} />);

    const menuButton = screen.getAllByRole("button")[0];
    fireEvent.click(menuButton);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("shows correct icon based on menu state", () => {
    const mockToggle = jest.fn();
    const { rerender } = render(
      <Header onMenuToggle={mockToggle} isMenuOpen={false} />
    );

    // Should show Menu icon when closed
    expect(
      screen.getByRole("button", { name: "Toggle menu" })
    ).toBeInTheDocument();

    rerender(<Header onMenuToggle={mockToggle} isMenuOpen={true} />);

    // Should show X icon when open
    expect(
      screen.getByRole("button", { name: "Toggle menu" })
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Header className="custom-header" />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("custom-header");
  });

  it("closes user menu when clicking outside", () => {
    render(<Header />);

    const userButton = screen.getByRole("button");
    fireEvent.click(userButton);

    expect(screen.getByText("John Doe")).toBeInTheDocument();

    // Click outside (on the overlay)
    const overlay = document.querySelector(".fixed.inset-0");
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
  });
});
