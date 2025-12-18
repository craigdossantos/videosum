'use client';

import React, { useEffect, useState } from 'react';
import { FolderIcon, ClockIcon, CalendarIcon, ArrowLeftIcon } from './Icons';

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
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const LibraryView: React.FC<LibraryViewProps> = ({ onSelectVideo, onBack }) => {
  const [videos, setVideos] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const res = await fetch('/api/class-notes/library');
        if (!res.ok) {
          throw new Error('Failed to load library');
        }
        const data = await res.json();
        setVideos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setLoading(false);
      }
    }
    fetchLibrary();
  }, []);

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
          <span className="text-sm text-gray-500">({videos.length} videos)</span>
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
              <button
                key={video.id}
                onClick={() => onSelectVideo(video.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900 mb-2">{video.title}</h3>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;
