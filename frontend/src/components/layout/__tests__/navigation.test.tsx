import { render, screen } from "@/__tests__/test-utils";
import { Navigation, Breadcrumb } from "../navigation";
import { Home, Settings } from "lucide-react";

const mockItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Profile", href: "/profile" },
];

// Mock usePathname
jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
}));

describe("Navigation", () => {
  it("renders navigation items correctly", () => {
    render(<Navigation items={mockItems} />);

    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/i })).toBeInTheDocument();
  });

  it("applies active state to current page", () => {
    render(<Navigation items={mockItems} />);

    const settingsLink = screen.getByRole("link", { name: /Settings/i });
    expect(settingsLink).toHaveClass("text-primary", "font-medium");
  });

  it("renders with horizontal orientation by default", () => {
    render(<Navigation items={mockItems} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("flex-row", "space-x-6");
  });

  it("renders with vertical orientation when specified", () => {
    render(<Navigation items={mockItems} orientation="vertical" />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("flex-col", "space-y-1");
  });

  it("applies pills variant correctly", () => {
    render(<Navigation items={mockItems} variant="pills" />);

    const settingsLink = screen.getByRole("link", { name: /Settings/i });
    expect(settingsLink).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("applies underline variant correctly", () => {
    render(<Navigation items={mockItems} variant="underline" />);

    const settingsLink = screen.getByRole("link", { name: /Settings/i });
    expect(settingsLink).toHaveClass(
      "border-b-2",
      "border-primary",
      "text-primary"
    );
  });

  it("renders icons when provided", () => {
    render(<Navigation items={mockItems} />);

    // Icons should be rendered (though we can't easily test the actual icon content)
    const homeLink = screen.getByRole("link", { name: /Home/i });
    const settingsLink = screen.getByRole("link", { name: /Settings/i });

    expect(homeLink).toBeInTheDocument();
    expect(settingsLink).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Navigation items={mockItems} className="custom-nav" />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("custom-nav");
  });
});

describe("Breadcrumb", () => {
  const breadcrumbItems = [
    { name: "Home", href: "/" },
    { name: "Settings", href: "/settings" },
    { name: "Profile" }, // No href for current page
  ];

  it("renders breadcrumb items correctly", () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders links for items with href", () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const homeLink = screen.getByRole("link", { name: "Home" });
    const settingsLink = screen.getByRole("link", { name: "Settings" });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("renders current page as text without link", () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const profileText = screen.getByText("Profile");
    expect(profileText).not.toHaveAttribute("href");
    expect(profileText).toHaveClass("font-medium", "text-foreground");
  });

  it("renders separators between items", () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    // Should have 2 separators for 3 items
    const separators = document.querySelectorAll("svg");
    expect(separators).toHaveLength(2);
  });

  it("applies custom className", () => {
    render(
      <Breadcrumb items={breadcrumbItems} className="custom-breadcrumb" />
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("custom-breadcrumb");
  });

  it("handles single item correctly", () => {
    render(<Breadcrumb items={[{ name: "Home" }]} />);

    expect(screen.getByText("Home")).toBeInTheDocument();

    // Should have no separators for single item
    const separators = document.querySelectorAll("svg");
    expect(separators).toHaveLength(0);
  });
});
