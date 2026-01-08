"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FolderIcon,
  ClockIcon,
  CalendarIcon,
  ArrowLeftIcon,
  FolderPlusIcon,
  PlusIcon,
  ChevronRightIcon,
} from "./Icons";

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

interface FolderRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  videoIds: string[];
  videoCount: number;
  hasOverview?: boolean;
  hasCombinedBlog?: boolean;
}

interface LibraryViewProps {
  onSelectVideo: (id: string) => void;
  onSelectFolder: (id: string) => void;
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

const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectVideo,
  onSelectFolder,
  onBack,
}) => {
  const [videos, setVideos] = useState<ClassRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [addingToFolder, setAddingToFolder] = useState<string | null>(null);
  const [reprocessingIds, setReprocessingIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchData = useCallback(async () => {
    try {
      const [videosRes, foldersRes] = await Promise.all([
        fetch("/api/class-notes/library"),
        fetch("/api/folders"),
      ]);

      if (!videosRes.ok) throw new Error("Failed to load videos");
      if (!foldersRes.ok) throw new Error("Failed to load folders");

      const [videosData, foldersData] = await Promise.all([
        videosRes.json(),
        foldersRes.json(),
      ]);

      setVideos(videosData);
      setFolders(foldersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get video IDs that are in folders
  const organizedVideoIds = new Set(folders.flatMap((f) => f.videoIds));
  const uncategorizedVideos = videos.filter(
    (v) => !organizedVideoIds.has(v.id),
  );

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || creatingFolder) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create folder");

      const folder = await res.json();
      setFolders((prev) => [...prev, { ...folder, videoCount: 0 }]);
      setNewFolderName("");
      setShowCreateFolder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleAddToFolder = async (folderId: string, videoId: string) => {
    try {
      const res = await fetch(`/api/folders/${folderId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!res.ok) throw new Error("Failed to add video to folder");

      // Update local state
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? {
                ...f,
                videoIds: [...f.videoIds, videoId],
                videoCount: f.videoCount + 1,
              }
            : f,
        ),
      );
      setAddingToFolder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add video");
    }
  };

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
      const res = await fetch(
        `/api/class-notes/${encodeURIComponent(videoId)}/reprocess`,
        {
          method: "POST",
        },
      );

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
            onClick={() => {
              setError(null);
              fetchData();
            }}
            className="mt-4 text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="library-view"
      className="bg-white rounded-xl shadow-sm border border-gray-200"
    >
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            data-testid="library-back-button"
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1">
            Video Library
          </h1>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FolderPlusIcon className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Create Folder Form */}
        {showCreateFolder && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-gray-900 mb-3">
              Create New Folder
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creatingFolder ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Folders Section */}
        {folders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Folders ({folders.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <FolderIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {folder.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {folder.videoCount} video
                      {folder.videoCount !== 1 ? "s" : ""}
                      {folder.hasOverview && " • Has summary"}
                    </p>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Uncategorized Videos */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {folders.length > 0
              ? `Uncategorized (${uncategorizedVideos.length})`
              : `All Videos (${videos.length})`}
          </h2>

          {uncategorizedVideos.length === 0 && videos.length === 0 ? (
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
          ) : uncategorizedVideos.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">
              All videos are organized in folders.
            </p>
          ) : (
            <div className="space-y-2">
              {uncategorizedVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <button
                    onClick={() => onSelectVideo(video.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-medium text-gray-900 mb-1">
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

                  {/* Reprocess button */}
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

                  {/* Add to Folder dropdown */}
                  {folders.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setAddingToFolder(
                            addingToFolder === video.id ? null : video.id,
                          )
                        }
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Add to folder"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>

                      {addingToFolder === video.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <p className="px-3 py-1 text-xs text-gray-500 uppercase">
                            Add to folder
                          </p>
                          {folders.map((folder) => (
                            <button
                              key={folder.id}
                              onClick={() =>
                                handleAddToFolder(folder.id, video.id)
                              }
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                            >
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryView;
