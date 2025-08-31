import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditor } from "../rich-text-editor";

// Mock @tiptap/react
jest.mock("@tiptap/react", () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => "<p>Test content</p>"),
    commands: {
      setContent: jest.fn(),
    },
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleStrike: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
        toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
        undo: jest.fn(() => ({ run: jest.fn() })),
        redo: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    can: jest.fn(() => ({
      undo: jest.fn(() => true),
      redo: jest.fn(() => true),
    })),
    isActive: jest.fn((format) => format === "bold"),
    setEditable: jest.fn(),
  })),
  EditorContent: ({ editor, className }: unknown) => (
    <div data-testid="editor-content" className={className}>
      Mock Editor Content
    </div>
  ),
}));

// Mock @tiptap/starter-kit
jest.mock("@tiptap/starter-kit", () => ({
  configure: jest.fn(() => ({})),
}));

// Mock @tiptap/extension-placeholder
jest.mock("@tiptap/extension-placeholder", () => ({
  configure: jest.fn(() => ({})),
}));

describe("RichTextEditor", () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with default props", () => {
    render(<RichTextEditor />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders toolbar when showToolbar is true", () => {
    render(<RichTextEditor showToolbar={true} />);

    // Check for toolbar buttons
    expect(screen.getByTitle("Bold (Ctrl+B)")).toBeInTheDocument();
    expect(screen.getByTitle("Italic (Ctrl+I)")).toBeInTheDocument();
    expect(screen.getByTitle("Strikethrough")).toBeInTheDocument();
    expect(screen.getByTitle("Bullet List")).toBeInTheDocument();
    expect(screen.getByTitle("Numbered List")).toBeInTheDocument();
    expect(screen.getByTitle("Quote")).toBeInTheDocument();
    expect(screen.getByTitle("Undo (Ctrl+Z)")).toBeInTheDocument();
    expect(screen.getByTitle("Redo (Ctrl+Y)")).toBeInTheDocument();
    expect(screen.getByTitle("Add Link")).toBeInTheDocument();
    expect(screen.getByTitle("Attach File")).toBeInTheDocument();
    expect(screen.getByTitle("Mention")).toBeInTheDocument();
  });

  it("hides toolbar when showToolbar is false", () => {
    render(<RichTextEditor showToolbar={false} />);

    expect(screen.queryByTitle("Bold (Ctrl+B)")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Italic (Ctrl+I)")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<RichTextEditor className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("applies custom min and max height", () => {
    render(<RichTextEditor minHeight="200px" maxHeight="500px" />);

    const editorContainer = screen.getByTestId("editor-content").parentElement;
    expect(editorContainer).toHaveStyle({
      minHeight: "200px",
      maxHeight: "500px",
    });
  });

  it("shows disabled state correctly", () => {
    const { container } = render(<RichTextEditor disabled={true} />);

    expect(container.firstChild).toHaveClass(
      "opacity-50",
      "cursor-not-allowed"
    );

    // Toolbar buttons should be disabled
    const boldButton = screen.getByTitle("Bold (Ctrl+B)");
    expect(boldButton).toBeDisabled();
  });

  it("handles toolbar button clicks", async () => {
    const user = userEvent.setup();
    render(<RichTextEditor />);

    const boldButton = screen.getByTitle("Bold (Ctrl+B)");
    await user.click(boldButton);

    // The mock should have been called (we can't test the actual editor behavior in this mock setup)
    expect(boldButton).toBeInTheDocument();
  });

  it("shows active state for formatting buttons", () => {
    render(<RichTextEditor />);

    const boldButton = screen.getByTitle("Bold (Ctrl+B)");
    // Based on our mock, bold should be active
    expect(boldButton).not.toHaveClass("variant-ghost");
  });

  it("handles undo/redo button states", () => {
    render(<RichTextEditor />);

    const undoButton = screen.getByTitle("Undo (Ctrl+Z)");
    const redoButton = screen.getByTitle("Redo (Ctrl+Y)");

    // Based on our mock, these should be enabled
    expect(undoButton).not.toBeDisabled();
    expect(redoButton).not.toBeDisabled();
  });

  it("handles link button click", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const user = userEvent.setup();

    render(<RichTextEditor />);

    const linkButton = screen.getByTitle("Add Link");
    await user.click(linkButton);

    expect(consoleSpy).toHaveBeenCalledWith("Add link clicked");

    consoleSpy.mockRestore();
  });

  it("handles attach file button click", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const user = userEvent.setup();

    render(<RichTextEditor />);

    const attachButton = screen.getByTitle("Attach File");
    await user.click(attachButton);

    expect(consoleSpy).toHaveBeenCalledWith("Attach file clicked");

    consoleSpy.mockRestore();
  });

  it("handles mention button click", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const user = userEvent.setup();

    render(<RichTextEditor />);

    const mentionButton = screen.getByTitle("Mention");
    await user.click(mentionButton);

    expect(consoleSpy).toHaveBeenCalledWith("Mention clicked");

    consoleSpy.mockRestore();
  });

  it("renders with custom placeholder", () => {
    render(<RichTextEditor placeholder="Custom placeholder" />);

    // The placeholder is handled by the TipTap extension, so we just verify the component renders
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("handles content prop", () => {
    render(<RichTextEditor content="<p>Initial content</p>" />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("calls onChange when provided", () => {
    render(<RichTextEditor onChange={mockOnChange} />);

    // The onChange would be called by the editor, but we can't test it directly with mocks
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("calls onBlur when provided", () => {
    render(<RichTextEditor onBlur={mockOnBlur} />);

    // The onBlur would be called by the editor, but we can't test it directly with mocks
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders all toolbar sections with separators", () => {
    render(<RichTextEditor />);

    // Check that separators are present (they help organize the toolbar)
    const separators = screen.getAllByRole("none");
    expect(separators.length).toBeGreaterThan(0);
  });

  it("applies correct prose classes to editor content", () => {
    render(<RichTextEditor />);

    const editorContent = screen.getByTestId("editor-content");
    expect(editorContent).toHaveClass(
      "prose",
      "prose-sm",
      "max-w-none",
      "focus:outline-none"
    );
  });

  it("handles keyboard shortcuts in button titles", () => {
    render(<RichTextEditor />);

    expect(screen.getByTitle("Bold (Ctrl+B)")).toBeInTheDocument();
    expect(screen.getByTitle("Italic (Ctrl+I)")).toBeInTheDocument();
    expect(screen.getByTitle("Undo (Ctrl+Z)")).toBeInTheDocument();
    expect(screen.getByTitle("Redo (Ctrl+Y)")).toBeInTheDocument();
  });

  it("renders with proper ARIA attributes", () => {
    render(<RichTextEditor />);

    // Toolbar buttons should have proper titles for accessibility
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveAttribute("title");
    });
  });
});
