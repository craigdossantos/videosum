"use client";

import React, { useState, useCallback } from "react";
import UploadCard from "@/components/mvp/UploadCard";
import NotesViewer from "@/components/mvp/NotesViewer";
import LibraryView from "@/components/mvp/LibraryView";
import FolderView from "@/components/mvp/FolderView";
import { SettingsModal } from "@/components/mvp/SettingsModal";
import {
  LoaderIcon,
  FolderIcon,
  CheckCircleIcon,
  SettingsIcon,
} from "@/components/mvp/Icons";

type ViewState = "idle" | "processing" | "viewing" | "library" | "folder";

interface NotesData {
  id: string;
  title: string;
  markdown: string; // AI-generated summary
  transcriptHtml: string; // Full transcript HTML
  blogMarkdown?: string; // Blog post markdown (optional)
  duration_seconds: number;
  processed_at: string;
}

interface ProgressState {
  step: string;
  message: string;
  progress?: number;
  total?: number;
}

const STEPS = [
  { id: "checking", label: "Checking" },
  { id: "extracting", label: "Extracting Audio" },
  { id: "transcribing", label: "Transcribing" },
  { id: "summarizing", label: "Generating Notes" },
  { id: "blogging", label: "Creating Blog Post" },
  { id: "finalizing", label: "Finalizing" },
];

function getStepIndex(stepId: string): number {
  return STEPS.findIndex((s) => s.id === stepId);
}

function ProcessingView({ progress }: { progress: ProgressState }) {
  const currentStepIndex = getStepIndex(progress.step);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="max-w-md mx-auto">
        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {STEPS.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div key={step.id} className="flex items-center gap-4">
                {/* Step indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : isCurrent ? (
                    <LoaderIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step label and message */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      isComplete
                        ? "text-green-700"
                        : isCurrent
                          ? "text-blue-700"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="text-sm text-gray-500 truncate">
                      {progress.message}
                    </div>
                  )}
                </div>

                {/* Chunk progress indicator */}
                {isCurrent && progress.total && progress.total > 1 && (
                  <div className="flex-shrink-0 text-sm text-blue-600 font-medium">
                    {progress.progress}/{progress.total}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar for chunks */}
        {progress.total && progress.total > 1 && progress.progress && (
          <div className="mt-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${(progress.progress / progress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Processing chunk {progress.progress} of {progress.total}
            </p>
          </div>
        )}

        {/* Helpful message */}
        <p className="text-center text-gray-500 text-sm mt-6">
          This may take a few minutes for longer videos.
        </p>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [currentNotes, setCurrentNotes] = useState<NotesData | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    step: "checking",
    message: "Starting...",
  });
  const [showSettings, setShowSettings] = useState(false);

  // Fetch library count on mount
  React.useEffect(() => {
    fetch("/api/class-notes/library")
      .then((res) => res.json())
      .then((data) => setLibraryCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setLibraryCount(0));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setViewState("processing");
    setError(null);
    setProgress({ step: "checking", message: "Starting..." });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/class-notes/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // For non-streaming error responses
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errData = await response.json();
          throw new Error(errData.error || "Processing failed");
        }
        throw new Error("Processing failed");
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let result: {
        folder_name?: string;
        status?: string;
        message?: string;
      } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === "progress") {
                setProgress({
                  step: data.step,
                  message: data.message,
                  progress: data.progress,
                  total: data.total,
                });
              } else if (data.type === "complete") {
                result = data;
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== "Unexpected end of JSON input"
              ) {
                throw parseErr;
              }
            }
          }
        }
      }

      if (!result) {
        throw new Error("No result received");
      }

      if (result.status === "duplicate") {
        // Handle duplicate - show existing notes
        const notesRes = await fetch(`/api/class-notes/${result.folder_name}`);
        if (!notesRes.ok) {
          throw new Error("Failed to load existing notes");
        }
        const notes: NotesData = await notesRes.json();
        setCurrentNotes(notes);
        setViewState("viewing");
        return;
      }

      // Fetch the full notes for the processed video
      const notesRes = await fetch(`/api/class-notes/${result.folder_name}`);
      if (!notesRes.ok) {
        throw new Error("Failed to load processed notes");
      }

      const notes: NotesData = await notesRes.json();
      setCurrentNotes(notes);
      setViewState("viewing");

      // Update library count
      setLibraryCount((prev) => (prev ?? 0) + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setViewState("idle");
    }
  }, []);

  const handleViewFromLibrary = useCallback(async (id: string) => {
    setViewState("processing");
    setError(null);
    setProgress({ step: "checking", message: "Loading notes..." });

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
      setViewState("library");
    }
  }, []);

  const handleBackToIdle = useCallback(() => {
    setViewState("idle");
    setCurrentNotes(null);
    setCurrentFolderId(null);
    setError(null);
  }, []);

  const handleSelectFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    setViewState("folder");
  }, []);

  const handleBackToLibrary = useCallback(() => {
    setCurrentFolderId(null);
    setViewState("library");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Class Notes Processor</span>
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

        {viewState === "idle" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Class Notes Generator
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Upload a video lecture or meeting recording to automatically
                generate structured notes with AI transcription and
                summarization.
              </p>
            </div>

            <UploadCard onFileSelect={handleFileSelect} />

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

        {viewState === "processing" && <ProcessingView progress={progress} />}

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
            onSelectFolder={handleSelectFolder}
            onBack={handleBackToIdle}
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
    </div>
  );
}
