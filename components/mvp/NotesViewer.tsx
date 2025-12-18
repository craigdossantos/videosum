'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeftIcon, DownloadIcon, ClockIcon, CalendarIcon } from './Icons';

interface NotesViewerProps {
  id: string;
  title: string;
  markdown: string;
  html: string;
  durationSeconds: number;
  processedAt: string;
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

const NotesViewer: React.FC<NotesViewerProps> = ({
  title,
  markdown,
  html,
  durationSeconds,
  processedAt,
  onBack,
}) => {
  const handleDownloadMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            <span>{formatDuration(durationSeconds)}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(processedAt)}</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            <button
              onClick={handleDownloadMd}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              Markdown
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              HTML
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

export default NotesViewer;
