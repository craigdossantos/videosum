"use client";

import React, { useEffect, useState } from "react";
import { FolderIcon, ClockIcon, CalendarIcon, ArrowLeftIcon } from "./Icons";

// Inline RefreshIcon component
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

interface ClassRecord {
  id: string;
  title: string;
  source_file: string;
  source_hash: string;
  duration_seconds: number;
  processed_at: string;
  costs: {
    transcription: number;
    summarization: number;
    total: number;
  };
}

interface LibraryViewProps {
  onSelectVideo: (id: string) => void;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const LibraryView: React.FC<LibraryViewProps> = ({ onSelectVideo, onBack }) => {
  const [videos, setVideos] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const res = await fetch("/api/class-notes/library");
        if (!res.ok) {
          throw new Error("Failed to load library");
        }
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load library");
      } finally {
        setLoading(false);
      }
    }
    fetchLibrary();
  }, []);

  const handleReprocess = async (videoId: string, e: React.MouseEvent) => {
    // Prevent the video selection from triggering
    e.stopPropagation();

    if (
      !confirm(
        "Regenerate summary for this video? This will use AI to create a new summary from the existing transcript.",
      )
    ) {
      return;
    }

    setReprocessingIds((prev) => new Set(prev).add(videoId));

    try {
      const res = await fetch(`/api/class-notes/${videoId}/reprocess`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to queue reprocess");
      }

      // Success - item is now in queue
      alert(
        "Video queued for reprocessing. Check the queue panel for progress.",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reprocess");
    } finally {
      setReprocessingIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading library...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={onBack}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Video Library</h1>
          <span className="text-sm text-gray-500">
            ({videos.length} videos)
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No videos processed yet</p>
            <button
              onClick={onBack}
              className="text-blue-600 hover:underline text-sm"
            >
              Upload your first video
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => onSelectVideo(video.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatDuration(video.duration_seconds)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(video.processed_at)}</span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleReprocess(video.id, e)}
                    disabled={reprocessingIds.has(video.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate summary"
                  >
                    <RefreshIcon
                      className={`w-4 h-4 ${reprocessingIds.has(video.id) ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;
