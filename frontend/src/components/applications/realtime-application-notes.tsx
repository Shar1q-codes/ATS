"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, Edit2, Trash2, AtSign } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { useApplicationRealtime } from "../../hooks/use-realtime";
import { TypingIndicator } from "../realtime/typing-indicator";
import { PresenceIndicator } from "../realtime/presence-indicator";

interface ApplicationNote {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  mentions?: string[];
}

interface RealtimeApplicationNotesProps {
  applicationId: string;
  initialNotes?: ApplicationNote[];
  currentUserId: string;
  onNoteAdded?: (note: ApplicationNote) => void;
  onNoteUpdated?: (note: ApplicationNote) => void;
}

export function RealtimeApplicationNotes({
  applicationId,
  initialNotes = [],
  currentUserId,
  onNoteAdded,
  onNoteUpdated,
}: RealtimeApplicationNotesProps) {
  const realtime = useApplicationRealtime(applicationId);
  const [notes, setNotes] = useState<ApplicationNote[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new notes are added
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes.length]);

  // Listen for real-time note events
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // New note added
    cleanupFunctions.push(
      realtime.addEventListener("application:note_added", (data) => {
        if (data.applicationId === applicationId) {
          const newNote: ApplicationNote = {
            id: data.note.id,
            content: data.note.content,
            author: data.note.author,
            createdAt: new Date(data.note.createdAt),
          };

          setNotes((prev) => [...prev, newNote]);
          onNoteAdded?.(newNote);
        }
      })
    );

    // Note edited
    cleanupFunctions.push(
      realtime.addEventListener("application:note_edited", (data) => {
        if (data.applicationId === applicationId) {
          setNotes((prev) =>
            prev.map((note) =>
              note.id === data.note.id
                ? {
                    ...note,
                    content: data.note.content,
                    updatedAt: new Date(data.note.updatedAt),
                  }
                : note
            )
          );

          const updatedNote = notes.find((n) => n.id === data.note.id);
          if (updatedNote) {
            onNoteUpdated?.({
              ...updatedNote,
              content: data.note.content,
              updatedAt: new Date(data.note.updatedAt),
            });
          }
        }
      })
    );

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [applicationId, realtime, notes, onNoteAdded, onNoteUpdated]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setNewNoteContent(value);

    if (value.trim()) {
      realtime.handleTyping();
    } else {
      realtime.stopTypingIndicator();
    }
  };

  const handleSubmitNote = async () => {
    if (!newNoteContent.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Extract mentions from content (simple @username detection)
      const mentions = extractMentions(newNoteContent);

      realtime.addApplicationNote(
        applicationId,
        newNoteContent.trim(),
        mentions
      );
      setNewNoteContent("");
      realtime.stopTypingIndicator();
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = (note: ApplicationNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingContent.trim() || !editingNoteId) return;

    try {
      const mentions = extractMentions(editingContent);
      realtime.editApplicationNote(
        editingNoteId,
        editingContent.trim(),
        mentions
      );

      setEditingNoteId(null);
      setEditingContent("");
    } catch (error) {
      console.error("Failed to edit note:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNoteContent = (content: string) => {
    // Simple mention highlighting
    return content.replace(
      /@(\w+)/g,
      '<span class="bg-blue-100 text-blue-800 px-1 rounded">@$1</span>'
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notes & Comments</CardTitle>
          <PresenceIndicator viewers={realtime.viewers} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notes list */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No notes yet. Add the first note below.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(note.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {note.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {note.updatedAt && (
                      <Badge variant="secondary" className="text-xs">
                        edited
                      </Badge>
                    )}
                  </div>

                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[60px]"
                        placeholder="Edit your note..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="text-sm text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html: renderNoteContent(note.content),
                        }}
                      />

                      {note.author.id === currentUserId && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNote(note)}
                            className="h-6 px-2 text-xs"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          <div ref={notesEndRef} />
        </div>

        {/* Typing indicator */}
        <TypingIndicator typingUsers={realtime.typingUsers} />

        {/* New note input */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={newNoteContent}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Add a note... Use @username to mention someone"
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmitNote();
              }
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AtSign className="h-3 w-3" />
              <span>Use @username to mention team members</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitNote}
                disabled={!newNoteContent.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Add Note
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Press Ctrl+Enter to send quickly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
