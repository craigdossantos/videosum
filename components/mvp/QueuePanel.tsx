"use client";

import { useState } from "react";
import type { QueueState, QueueItem } from "@/lib/queue";
import { LoaderIcon, CheckCircleIcon, XIcon } from "./Icons";

interface QueuePanelProps {
  queueState: QueueState | null;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onClearCompleted: () => void;
  onViewNotes?: (folderId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Inline icon components to avoid import issues
function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

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

function ChevronUpIcon({ className }: { className?: string }) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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

function FileVideoIcon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m10 13-2 2 2 2" />
      <path d="m14 17 2-2-2-2" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
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
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <path d="M14 4h7" />
      <path d="M14 9h7" />
      <path d="M14 15h7" />
      <path d="M14 20h7" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function QueueItemRow({
  item,
  onRemove,
  onRetry,
  onViewNotes,
}: {
  item: QueueItem;
  onRemove: () => void;
  onRetry: () => void;
  onViewNotes?: () => void;
}) {
  const statusIcons = {
    pending: <ClockIcon className="h-4 w-4 text-gray-400" />,
    processing: <LoaderIcon className="h-4 w-4 text-blue-500 animate-spin" />,
    completed: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
    failed: <AlertCircleIcon className="h-4 w-4 text-red-500" />,
    cancelled: <XIcon className="h-4 w-4 text-gray-400" />,
  };

  const statusColors = {
    pending: "text-gray-500",
    processing: "text-blue-600",
    completed: "text-green-600",
    failed: "text-red-600",
    cancelled: "text-gray-500",
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg">
      <FileVideoIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.originalFileName}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">{formatFileSize(item.fileSize)}</span>
          {item.progress && item.status === "processing" && (
            <span className="text-blue-600">{item.progress.message}</span>
          )}
          {item.error && (
            <span className="text-red-500 truncate" title={item.error}>
              {item.error}
            </span>
          )}
        </div>
        {item.status === "processing" &&
          item.progress?.progress !== undefined && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${item.progress.total ? (item.progress.progress / item.progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          )}
      </div>

      <div className="flex items-center gap-1">
        {statusIcons[item.status]}
        <span className={`text-xs ${statusColors[item.status]}`}>
          {item.status}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {item.status === "completed" && onViewNotes && item.resultFolderId && (
          <button
            onClick={onViewNotes}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
            title="View notes"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </button>
        )}
        {(item.status === "failed" || item.status === "cancelled") && (
          <button
            onClick={onRetry}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Retry"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        )}
        {item.status !== "processing" && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Remove"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function QueuePanel({
  queueState,
  onRemoveItem,
  onRetryItem,
  onClearCompleted,
  onViewNotes,
}: QueuePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!queueState || queueState.items.length === 0) {
    return null;
  }

  const pendingCount = queueState.items.filter(
    (i) => i.status === "pending",
  ).length;
  const processingCount = queueState.items.filter(
    (i) => i.status === "processing",
  ).length;
  const completedCount = queueState.items.filter(
    (i) => i.status === "completed",
  ).length;
  const failedCount = queueState.items.filter(
    (i) => i.status === "failed",
  ).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <QueueIcon className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Processing Queue</span>
          <div className="flex items-center gap-2 text-sm">
            {processingCount > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <LoaderIcon className="h-3 w-3 animate-spin" />
                {processingCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-gray-500">{pendingCount} pending</span>
            )}
            {completedCount > 0 && (
              <span className="text-green-600">{completedCount} done</span>
            )}
            {failedCount > 0 && (
              <span className="text-red-600">{failedCount} failed</span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Items list */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="max-h-64 overflow-y-auto px-2 py-1">
            {queueState.items.map((item) => (
              <QueueItemRow
                key={item.id}
                item={item}
                onRemove={() => onRemoveItem(item.id)}
                onRetry={() => onRetryItem(item.id)}
                onViewNotes={
                  item.resultFolderId
                    ? () => onViewNotes?.(item.resultFolderId!)
                    : undefined
                }
              />
            ))}
          </div>

          {/* Footer with actions */}
          {completedCount > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
              <button
                onClick={onClearCompleted}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <TrashIcon className="h-4 w-4" />
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Status indicator for header
export function QueueStatusIndicator({
  queueState,
  onClick,
}: {
  queueState: QueueState | null;
  onClick: () => void;
}) {
  if (!queueState || queueState.items.length === 0) {
    return null;
  }

  const processingCount = queueState.items.filter(
    (i) => i.status === "processing",
  ).length;
  const pendingCount = queueState.items.filter(
    (i) => i.status === "pending",
  ).length;
  const totalActive = processingCount + pendingCount;

  if (totalActive === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
    >
      <LoaderIcon className="h-4 w-4 animate-spin" />
      <span>
        {processingCount > 0 ? "Processing" : "Queued"}: {totalActive}
      </span>
    </button>
  );
}
