"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link,
  Paperclip,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  showToolbar?: boolean;
  minHeight?: string;
  maxHeight?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  content = "",
  placeholder = "Start typing...",
  onChange,
  onBlur,
  className,
  disabled = false,
  showToolbar = true,
  minHeight = "120px",
  maxHeight = "400px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {showToolbar && (
        <div className="border-b p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              disabled={disabled}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              disabled={disabled}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              disabled={disabled}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              disabled={disabled}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              disabled={disabled}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              disabled={disabled}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={disabled || !editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={disabled || !editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            {/* Additional Actions */}
            <ToolbarButton
              onClick={() => {
                // TODO: Implement link functionality
                console.log("Add link clicked");
              }}
              disabled={disabled}
              title="Add Link"
            >
              <Link className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => {
                // TODO: Implement file attachment
                console.log("Attach file clicked");
              }}
              disabled={disabled}
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => {
                // TODO: Implement mention functionality
                console.log("Mention clicked");
              }}
              disabled={disabled}
              title="Mention"
            >
              <AtSign className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
      )}

      <div
        className="p-3"
        style={{
          minHeight,
          maxHeight,
          overflowY: "auto",
        }}
      >
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm max-w-none focus:outline-none",
            "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[80px]",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
          )}
        />
      </div>
    </div>
  );
}

export default RichTextEditor;
