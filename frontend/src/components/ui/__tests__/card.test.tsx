import { render, screen } from "@/__tests__/test-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card Components", () => {
  it("renders Card correctly", () => {
    render(
      <Card data-testid="card">
        <div>Card content</div>
      </Card>
    );

    const card = screen.getByTestId("card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("rounded-lg", "border", "bg-card");
  });

  it("renders CardHeader correctly", () => {
    render(
      <CardHeader data-testid="card-header">
        <div>Header content</div>
      </CardHeader>
    );

    const header = screen.getByTestId("card-header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("flex", "flex-col", "space-y-1.5", "p-6");
  });

  it("renders CardTitle correctly", () => {
    render(<CardTitle>Test Title</CardTitle>);

    const title = screen.getByRole("heading", { name: "Test Title" });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("text-2xl", "font-semibold");
  });

  it("renders CardDescription correctly", () => {
    render(<CardDescription>Test description</CardDescription>);

    const description = screen.getByText("Test description");
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass("text-sm", "text-muted-foreground");
  });

  it("renders CardContent correctly", () => {
    render(
      <CardContent data-testid="card-content">
        <div>Content</div>
      </CardContent>
    );

    const content = screen.getByTestId("card-content");
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass("p-6", "pt-0");
  });

  it("renders CardFooter correctly", () => {
    render(
      <CardFooter data-testid="card-footer">
        <div>Footer</div>
      </CardFooter>
    );

    const footer = screen.getByTestId("card-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass("flex", "items-center", "p-6", "pt-0");
  });

  it("renders complete card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(
      screen.getByRole("heading", { name: "Card Title" })
    ).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Card content goes here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("applies custom className to all components", () => {
    render(
      <Card className="custom-card" data-testid="card">
        <CardHeader className="custom-header" data-testid="header">
          <CardTitle className="custom-title">Title</CardTitle>
          <CardDescription className="custom-description">
            Description
          </CardDescription>
        </CardHeader>
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId("card")).toHaveClass("custom-card");
    expect(screen.getByTestId("header")).toHaveClass("custom-header");
    expect(screen.getByRole("heading")).toHaveClass("custom-title");
    expect(screen.getByText("Description")).toHaveClass("custom-description");
    expect(screen.getByTestId("content")).toHaveClass("custom-content");
    expect(screen.getByTestId("footer")).toHaveClass("custom-footer");
  });
});
