"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  FolderIcon,
  XIcon,
} from "./Icons";

// Inline TrashIcon component (matches LibraryView pattern)
function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// 6-dot grip icon for drag handle
function GripVerticalIcon({ className }: { className?: string }) {
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
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="19" r="1" fill="currentColor" />
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

interface FolderData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  videoIds: string[];
  videoCount: number;
  hasOverview?: boolean;
  hasCombinedBlog?: boolean;
  overview?: string;
  combinedBlog?: string;
}

interface FolderViewProps {
  folderId: string;
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

interface SortableVideoCardProps {
  video: ClassRecord;
  onSelectVideo: (id: string) => void;
  onDeleteVideo: (id: string) => void;
  onRemoveVideo: (id: string) => void;
  deletingVideo: string | null;
  removingVideo: string | null;
}

function SortableVideoCard({
  video,
  onSelectVideo,
  onDeleteVideo,
  onRemoveVideo,
  deletingVideo,
  removingVideo,
}: SortableVideoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group bg-white"
    >
      {/* Drag handle (replaces order number) */}
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 rounded touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="w-5 h-5" />
      </button>

      {/* Video info */}
      <button
        onClick={() => onSelectVideo(video.id)}
        className="flex-1 text-left"
      >
        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
          {video.title}
        </h3>
        {video.source_file && (
          <p className="text-xs text-gray-400 truncate">
            {video.source_file.split("/").pop() || video.source_file}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
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

      {/* Delete button (permanent delete / OS trash) */}
      <button
        onClick={() => onDeleteVideo(video.id)}
        disabled={deletingVideo === video.id}
        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        title="Delete video permanently"
      >
        {deletingVideo === video.id ? (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
        ) : (
          <TrashIcon className="w-5 h-5" />
        )}
      </button>

      {/* Remove from folder button */}
      <button
        onClick={() => onRemoveVideo(video.id)}
        disabled={removingVideo === video.id}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        title="Remove from folder"
      >
        {removingVideo === video.id ? (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <XIcon className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

const FolderView: React.FC<FolderViewProps> = ({
  folderId,
  onSelectVideo,
  onBack,
}) => {
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [videos, setVideos] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingVideo, setRemovingVideo] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch folder details
      const folderRes = await fetch(`/api/folders/${folderId}`);
      if (!folderRes.ok) throw new Error("Failed to load folder");
      const folderData: FolderData = await folderRes.json();
      setFolder(folderData);

      // Fetch all videos to get details for the ones in this folder
      const videosRes = await fetch("/api/class-notes/library");
      if (!videosRes.ok) throw new Error("Failed to load videos");
      const allVideos: ClassRecord[] = await videosRes.json();

      // Filter to only videos in this folder, maintaining order
      const folderVideos = folderData.videoIds
        .map((id) => allVideos.find((v) => v.id === id))
        .filter((v): v is ClassRecord => v !== undefined);

      setVideos(folderVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folder");
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Shared helper: remove a video from local state (videos list + folder metadata)
  const removeVideoFromLocalState = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setFolder((prev) =>
      prev
        ? {
            ...prev,
            videoIds: prev.videoIds.filter((id) => id !== videoId),
            videoCount: prev.videoCount - 1,
          }
        : null,
    );
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (removingVideo) return;
    setRemovingVideo(videoId);

    try {
      const res = await fetch(
        `/api/folders/${folderId}/videos?videoId=${videoId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to remove video");

      removeVideoFromLocalState(videoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove video");
    } finally {
      setRemovingVideo(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (deletingVideo) return;

    if (
      !confirm("Delete this video permanently? This action cannot be undone.")
    ) {
      return;
    }

    setDeletingVideo(videoId);

    try {
      // If Electron is available, move to OS trash first
      const electronAPI = (
        window as unknown as {
          electronAPI?: {
            trashItem: (
              id: string,
            ) => Promise<{ success: boolean; error?: string }>;
          };
        }
      ).electronAPI;
      if (electronAPI?.trashItem) {
        await electronAPI.trashItem(videoId);
      }

      // Call DELETE API to clean up folders.json and remove from disk
      const res = await fetch(
        `/api/class-notes/${encodeURIComponent(videoId)}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to delete video");
      }

      removeVideoFromLocalState(videoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video");
    } finally {
      setDeletingVideo(null);
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id || !folder) return;

      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newVideos = arrayMove(videos, oldIndex, newIndex);
      const newVideoIds = newVideos.map((v) => v.id);

      // Optimistic update: apply new order locally immediately
      setVideos(newVideos);
      setFolder((prev) => (prev ? { ...prev, videoIds: newVideoIds } : null));

      // Persist the new order via PATCH
      try {
        const res = await fetch(`/api/folders/${folderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoIds: newVideoIds }),
        });

        if (!res.ok) {
          throw new Error("Failed to save new order");
        }
      } catch (err) {
        // Revert on failure
        setError(
          err instanceof Error ? err.message : "Failed to save new order",
        );
        setVideos(videos);
        setFolder((prev) =>
          prev ? { ...prev, videoIds: prev.videoIds } : null,
        );
      }
    },
    [videos, folder, folderId],
  );

  const totalDuration = videos.reduce((acc, v) => acc + v.duration_seconds, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading folder...</span>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-red-600">
          <p>{error || "Folder not found"}</p>
          <button
            onClick={onBack}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Library
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
            aria-label="Back to Library"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <FolderIcon className="w-6 h-6 text-blue-500" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              {folder.name}
            </h1>
            {folder.description && (
              <p className="text-sm text-gray-500">{folder.description}</p>
            )}
          </div>
        </div>

        {/* Folder Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-700">{videos.length}</span>
            <span>video{videos.length !== 1 ? "s" : ""}</span>
          </div>
          {totalDuration > 0 && (
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatDuration(totalDuration)} total</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Created {formatDate(folder.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Video List */}
      <div className="p-4">
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">This folder is empty</p>
            <button
              onClick={onBack}
              className="text-blue-600 hover:underline text-sm"
            >
              Add videos from the library
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={videos.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {videos.map((video) => (
                  <SortableVideoCard
                    key={video.id}
                    video={video}
                    onSelectVideo={onSelectVideo}
                    onDeleteVideo={handleDeleteVideo}
                    onRemoveVideo={handleRemoveVideo}
                    deletingVideo={deletingVideo}
                    removingVideo={removingVideo}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default FolderView;
