'use client';

import React, { useState, useCallback } from 'react';
import UploadCard from '@/components/mvp/UploadCard';
import NotesViewer from '@/components/mvp/NotesViewer';
import LibraryView from '@/components/mvp/LibraryView';
import { LoaderIcon, FolderIcon } from '@/components/mvp/Icons';

type ViewState = 'idle' | 'processing' | 'viewing' | 'library';

interface NotesData {
  id: string;
  title: string;
  markdown: string;
  html: string;
  duration_seconds: number;
  processed_at: string;
}

export default function DemoPage() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [currentNotes, setCurrentNotes] = useState<NotesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);

  // Fetch library count on mount
  React.useEffect(() => {
    fetch('/api/class-notes/library')
      .then((res) => res.json())
      .then((data) => setLibraryCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setLibraryCount(0));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setViewState('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/class-notes/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Processing failed');
      }

      const result = await res.json();

      // Fetch the full notes for the processed video
      const notesRes = await fetch(`/api/class-notes/${result.folder_name}`);
      if (!notesRes.ok) {
        throw new Error('Failed to load processed notes');
      }

      const notes: NotesData = await notesRes.json();
      setCurrentNotes(notes);
      setViewState('viewing');

      // Update library count
      setLibraryCount((prev) => (prev ?? 0) + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setViewState('idle');
    }
  }, []);

  const handleViewFromLibrary = useCallback(async (id: string) => {
    setViewState('processing');
    setError(null);

    try {
      const res = await fetch(`/api/class-notes/${id}`);
      if (!res.ok) {
        throw new Error('Failed to load notes');
      }

      const notes: NotesData = await res.json();
      setCurrentNotes(notes);
      setViewState('viewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      setViewState('library');
    }
  }, []);

  const handleBackToIdle = useCallback(() => {
    setViewState('idle');
    setCurrentNotes(null);
    setError(null);
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
          <div className="text-xs text-gray-500">Class Notes Processor</div>
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

        {viewState === 'idle' && (
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
                  onClick={() => setViewState('library')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FolderIcon className="w-4 h-4" />
                  View Library ({libraryCount} videos)
                </button>
              </div>
            )}
          </div>
        )}

        {viewState === 'processing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <LoaderIcon className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Processing your video...
              </h3>
              <p className="text-gray-500 max-w-md">
                This may take a few minutes depending on the video length. We're
                extracting audio, transcribing, and generating notes.
              </p>
            </div>
          </div>
        )}

        {viewState === 'viewing' && currentNotes && (
          <NotesViewer
            id={currentNotes.id}
            title={currentNotes.title}
            markdown={currentNotes.markdown}
            html={currentNotes.html}
            durationSeconds={currentNotes.duration_seconds}
            processedAt={currentNotes.processed_at}
            onBack={handleBackToIdle}
          />
        )}

        {viewState === 'library' && (
          <LibraryView
            onSelectVideo={handleViewFromLibrary}
            onBack={handleBackToIdle}
          />
        )}
      </main>
    </div>
  );
}
