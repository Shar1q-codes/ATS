import { render, screen } from "@/__tests__/test-utils";
import { LoadingSpinner, LoadingSkeleton, LoadingState } from "../loading";

describe("Loading Components", () => {
  describe("LoadingSpinner", () => {
    it("renders correctly", () => {
      render(<LoadingSpinner data-testid="spinner" />);

      const spinner = screen.getByTestId("spinner");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin", "rounded-full", "border-2");
    });

    it("applies size classes correctly", () => {
      render(<LoadingSpinner size="lg" data-testid="spinner" />);

      const spinner = screen.getByTestId("spinner");
      expect(spinner).toHaveClass("h-8", "w-8");
    });

    it("applies custom className", () => {
      render(
        <LoadingSpinner className="custom-spinner" data-testid="spinner" />
      );

      const spinner = screen.getByTestId("spinner");
      expect(spinner).toHaveClass("custom-spinner");
    });
  });

  describe("LoadingSkeleton", () => {
    it("renders correctly", () => {
      render(<LoadingSkeleton data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse", "rounded-md", "bg-muted");
    });

    it("applies custom className", () => {
      render(<LoadingSkeleton className="h-4 w-full" data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-4", "w-full");
    });
  });

  describe("LoadingState", () => {
    it("renders children when not loading", () => {
      render(
        <LoadingState loading={false}>
          <div>Content</div>
        </LoadingState>
      );

      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("renders skeleton when loading and skeleton provided", () => {
      render(
        <LoadingState
          loading={true}
          skeleton={<div data-testid="skeleton">Loading skeleton</div>}
        >
          <div>Content</div>
        </LoadingState>
      );

      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("renders spinner when loading and spinner is true", () => {
      render(
        <LoadingState loading={true} spinner={true}>
          <div>Content</div>
        </LoadingState>
      );

      expect(screen.getAllByRole("generic")[0]).toHaveClass(
        "flex",
        "items-center",
        "justify-center"
      );
      expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("renders nothing when loading without skeleton or spinner", () => {
      const { container } = render(
        <LoadingState loading={true}>
          <div>Content</div>
        </LoadingState>
      );

      expect(container.firstChild).toBeNull();
    });

    it("applies custom className to spinner container", () => {
      render(
        <LoadingState loading={true} spinner={true} className="custom-loading">
          <div>Content</div>
        </LoadingState>
      );

      expect(screen.getAllByRole("generic")[0]).toHaveClass("custom-loading");
    });
  });
});
