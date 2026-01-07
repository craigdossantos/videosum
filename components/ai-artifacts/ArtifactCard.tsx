"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Artifact } from "@/lib/ai-artifacts";

interface ArtifactCardProps {
  artifact: Artifact;
  onDelete: () => void;
  compact?: boolean;
}

// Inline icons to keep this component self-contained for reusability
const ChevronDownIcon = ({ className }: { className?: string }) => (
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
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
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
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
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

const DownloadIcon = ({ className }: { className?: string }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export function ArtifactCard({
  artifact,
  onDelete,
  compact = false,
}: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
        <span className="truncate flex-1 font-medium text-gray-700">
          {artifact.title}
        </span>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleDownload}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Download"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {artifact.title}
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(artifact.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Download as Markdown"
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete artifact"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{artifact.content}</ReactMarkdown>
          </div>
          {artifact.prompt && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Prompt: &quot;{artifact.prompt}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
