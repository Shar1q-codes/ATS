"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import {
  useApplicationNotesQuery,
  useCreateApplicationNoteMutation,
  useUpdateApplicationNoteMutation,
  useDeleteApplicationNoteMutation,
} from "@/hooks/api/use-applications-api";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Lock,
  MessageSquare,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApplicationNotesProps {
  applicationId: string;
}

export function ApplicationNotes({ applicationId }: ApplicationNotesProps) {
  const { toast } = useToast();
  const [newNote, setNewNote] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [showAddNote, setShowAddNote] = React.useState(false);
  const [useRichText, setUseRichText] = React.useState(false);

  const {
    data: notes,
    isLoading,
    error,
  } = useApplicationNotesQuery(applicationId);
  const createNoteMutation = useCreateApplicationNoteMutation();
  const updateNoteMutation = useUpdateApplicationNoteMutation();
  const deleteNoteMutation = useDeleteApplicationNoteMutation();

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;

    try {
      await createNoteMutation.mutateAsync({
        applicationId,
        content: newNote.trim(),
        isPrivate,
      });

      setNewNote("");
      setIsPrivate(false);
      setShowAddNote(false);

      toast({
        title: "Note added",
        description: "Your note has been added successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to add note",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) return;

    try {
      await updateNoteMutation.mutateAsync({
        id: noteId,
        content: editingContent.trim(),
      });

      setEditingNoteId(null);
      setEditingContent("");

      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to update note",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteNoteMutation.mutateAsync({
        id: noteId,
        applicationId,
      });

      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete note",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingContent(content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>Failed to load notes. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes ({notes?.length || 0})
            </CardTitle>
            {!showAddNote && (
              <Button onClick={() => setShowAddNote(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        {showAddNote && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useRichText"
                    checked={useRichText}
                    onChange={(e) => setUseRichText(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="useRichText" className="text-sm">
                    Rich text formatting
                  </label>
                </div>
              </div>

              {useRichText ? (
                <RichTextEditor
                  content={newNote}
                  placeholder="Add a note about this application..."
                  onChange={setNewNote}
                  minHeight="120px"
                  maxHeight="300px"
                />
              ) : (
                <Textarea
                  placeholder="Add a note about this application..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isPrivate" className="text-sm">
                    Private note (only visible to you)
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNote("");
                      setIsPrivate(false);
                      setUseRichText(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateNote}
                    disabled={!newNote.trim() || createNoteMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notes List */}
      {notes?.length ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {note.author?.firstName} {note.author?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {note.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(note.id, note.content)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        content={editingContent}
                        onChange={setEditingContent}
                        minHeight="120px"
                        maxHeight="300px"
                        placeholder="Edit your note..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={
                            !editingContent.trim() ||
                            updateNoteMutation.isPending
                          }
                        >
                          <Save className="mr-1 h-3 w-3" />
                          {updateNoteMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4" />
              <p>No notes yet</p>
              <p className="text-sm">
                Add the first note to track your thoughts about this
                application.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
