"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import UploadCard from "@/components/mvp/UploadCard";
import CompactUploadBar from "@/components/mvp/CompactUploadBar";
import NotesViewer from "@/components/mvp/NotesViewer";
import LibraryView from "@/components/mvp/LibraryView";
import FolderView from "@/components/mvp/FolderView";
import { QueuePanel } from "@/components/mvp/QueuePanel";
import { SettingsModal } from "@/components/mvp/SettingsModal";
import { SettingsIcon } from "@/components/mvp/Icons";
import { useQueueEvents } from "@/hooks/useQueueEvents";

type ViewState = "library" | "folder" | "viewing";

interface NotesData {
  id: string;
  title: string;
  markdown: string; // AI-generated summary
  transcriptHtml: string; // Full transcript HTML
  blogMarkdown?: string; // Blog post markdown (optional)
  duration_seconds: number;
  processed_at: string;
}

export default function DemoPage() {
  const [viewState, setViewState] = useState<ViewState>("library");
  const [currentNotes, setCurrentNotes] = useState<NotesData | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Queue system for real-time processing state
  const { queueState, removeItem, retryItem, clearCompleted } =
    useQueueEvents();

  // Auto-refresh library when a queue item completes
  const prevCompletedCountRef = useRef(0);
  useEffect(() => {
    const completedCount =
      queueState?.items.filter((i) => i.status === "completed").length ?? 0;
    if (completedCount > prevCompletedCountRef.current) {
      setRefreshKey((k) => k + 1);
    }
    prevCompletedCountRef.current = completedCount;
  }, [queueState?.items]);

  const handleFilesSelect = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setError(null);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/queue", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add to queue");
      }

      // User stays on library view. Queue panel (wired in 3.3) handles progress display.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to queue");
    }
  }, []);

  const handleViewFromLibrary = useCallback(async (id: string) => {
    setError(null);

    try {
      const res = await fetch(`/api/class-notes/${encodeURIComponent(id)}`);
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

  const handleBackToLibrary = useCallback(() => {
    setCurrentNotes(null);
    setCurrentFolderId(null);
    setError(null);
    setViewState("library");
  }, []);

  const handleSelectFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setViewState("folder");
  }, []);

  const handleVideoCountChange = useCallback(
    (count: number) => setVideoCount(count),
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={handleBackToLibrary}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              V
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              VideoSum
            </h1>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Video Summarizer</span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Upload area: compact bar when videos exist, full card when empty */}
        {viewState === "library" && (
          <div className="mb-6">
            {videoCount > 0 ? (
              <CompactUploadBar onFilesSelect={handleFilesSelect} />
            ) : (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center py-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Video Summarizer
                  </h2>
                  <p className="text-gray-600 max-w-xl mx-auto">
                    Upload a video lecture or meeting recording to automatically
                    generate structured notes with AI transcription and
                    summarization.
                  </p>
                </div>
                <UploadCard onFilesSelect={handleFilesSelect} />
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
            onBack={handleBackToLibrary}
          />
        )}

        {viewState === "library" && (
          <LibraryView
            onSelectVideo={handleViewFromLibrary}
            onSelectFolder={handleSelectFolder}
            onBack={handleBackToLibrary}
            onVideoCountChange={handleVideoCountChange}
            refreshKey={refreshKey}
          />
        )}

        {viewState === "folder" && currentFolderId && (
          <FolderView
            folderId={currentFolderId}
            onSelectVideo={handleViewFromLibrary}
            onBack={handleBackToLibrary}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Queue Panel — fixed bottom bar for processing progress */}
      <QueuePanel
        queueState={queueState}
        onRemoveItem={removeItem}
        onRetryItem={retryItem}
        onClearCompleted={clearCompleted}
        onViewNotes={handleViewFromLibrary}
      />
    </div>
  );
}
