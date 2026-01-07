"use client";

import React, { useState, useCallback } from "react";
import UploadCard from "@/components/mvp/UploadCard";
import NotesViewer from "@/components/mvp/NotesViewer";
import LibraryView from "@/components/mvp/LibraryView";
import { QueuePanel } from "@/components/mvp/QueuePanel";
import { useQueueEvents } from "@/hooks/useQueueEvents";
import { FolderIcon } from "@/components/mvp/Icons";

type ViewState = "idle" | "viewing" | "library";

interface NotesData {
  id: string;
  title: string;
  markdown: string;
  transcriptHtml: string;
  blogMarkdown?: string;
  duration_seconds: number;
  processed_at: string;
}

export default function DemoPage() {
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [currentNotes, setCurrentNotes] = useState<NotesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);

  // Queue management
  const {
    queueState,
    addToQueue,
    removeItem,
    retryItem,
    clearCompleted,
    error: queueError,
  } = useQueueEvents();

  // Fetch library count on mount
  React.useEffect(() => {
    fetch("/api/class-notes/library")
      .then((res) => res.json())
      .then((data) => setLibraryCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setLibraryCount(0));
  }, []);

  // Refresh library count when items complete
  React.useEffect(() => {
    if (queueState?.items.some((item) => item.status === "completed")) {
      fetch("/api/class-notes/library")
        .then((res) => res.json())
        .then((data) => setLibraryCount(Array.isArray(data) ? data.length : 0))
        .catch(() => {});
    }
  }, [queueState]);

  const handleFilesSelect = useCallback(
    async (files: File[]) => {
      setError(null);
      const success = await addToQueue(files);
      if (!success) {
        setError(queueError || "Failed to add videos to queue");
      }
    },
    [addToQueue, queueError],
  );

  const handleViewFromLibrary = useCallback(async (id: string) => {
    setError(null);

    try {
      const res = await fetch(`/api/class-notes/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load notes");
      }

      const notes: NotesData = await res.json();
      setCurrentNotes(notes);
      setViewState("viewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    }
  }, []);

  const handleViewNotes = useCallback(
    (folderId: string) => {
      handleViewFromLibrary(folderId);
    },
    [handleViewFromLibrary],
  );

  const handleBackToIdle = useCallback(() => {
    setViewState("idle");
    setCurrentNotes(null);
    setError(null);
  }, []);

  // Calculate queue counts
  const pendingCount =
    queueState?.items.filter(
      (i) => i.status === "pending" || i.status === "processing",
    ).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={handleBackToIdle}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              V
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              VideoSum
            </h1>
          </button>
          <div className="text-xs text-gray-500">Class Notes Processor</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {(error || queueError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error || queueError}</p>
          </div>
        )}

        {viewState === "idle" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Class Notes Generator
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Upload video lectures or meeting recordings to automatically
                generate structured notes with AI transcription and
                summarization. Select multiple videos to process them in the
                background.
              </p>
            </div>

            <UploadCard
              onFilesSelect={handleFilesSelect}
              queueCount={pendingCount}
            />

            {libraryCount !== null && libraryCount > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setViewState("library")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FolderIcon className="w-4 h-4" />
                  View Library ({libraryCount} videos)
                </button>
              </div>
            )}
          </div>
        )}

        {viewState === "viewing" && currentNotes && (
          <NotesViewer
            id={currentNotes.id}
            title={currentNotes.title}
            summaryMarkdown={currentNotes.markdown}
            transcriptHtml={currentNotes.transcriptHtml}
            blogMarkdown={currentNotes.blogMarkdown}
            durationSeconds={currentNotes.duration_seconds}
            processedAt={currentNotes.processed_at}
            onBack={handleBackToIdle}
          />
        )}

        {viewState === "library" && (
          <LibraryView
            onSelectVideo={handleViewFromLibrary}
            onBack={handleBackToIdle}
          />
        )}
      </main>

      {/* Queue Panel */}
      <QueuePanel
        queueState={queueState}
        onRemoveItem={removeItem}
        onRetryItem={retryItem}
        onClearCompleted={clearCompleted}
        onViewNotes={handleViewNotes}
      />
    </div>
  );
}
