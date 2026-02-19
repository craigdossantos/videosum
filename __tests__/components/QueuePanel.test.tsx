import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueuePanel } from "@/components/mvp/QueuePanel";
import type { QueueState } from "@/lib/queue";

describe("QueuePanel", () => {
  let mockOnRemoveItem: ReturnType<typeof vi.fn>;
  let mockOnRetryItem: ReturnType<typeof vi.fn>;
  let mockOnClearCompleted: ReturnType<typeof vi.fn>;
  let mockOnViewNotes: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnRemoveItem = vi.fn();
    mockOnRetryItem = vi.fn();
    mockOnClearCompleted = vi.fn();
    mockOnViewNotes = vi.fn();
  });

  function createQueueState(items: QueueState["items"]): QueueState {
    return {
      items,
      isProcessing: items.some((i) => i.status === "processing"),
      lastUpdated: Date.now(),
    };
  }

  describe("Rendering", () => {
    it("does not render when queue is empty", () => {
      const { container } = render(
        <QueuePanel
          queueState={null}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("does not render when items array is empty", () => {
      const { container } = render(
        <QueuePanel
          queueState={createQueueState([])}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("shows queue count badges", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "a.mp4",
          fileSize: 1000,
          status: "pending",
          filePath: "/tmp/a",
        },
        {
          id: "2",
          originalFileName: "b.mp4",
          fileSize: 2000,
          status: "processing",
          filePath: "/tmp/b",
        },
        {
          id: "3",
          originalFileName: "c.mp4",
          fileSize: 3000,
          status: "completed",
          filePath: "/tmp/c",
        },
        {
          id: "4",
          originalFileName: "d.mp4",
          fileSize: 4000,
          status: "failed",
          error: "Error",
          filePath: "/tmp/d",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(screen.getByText("1 pending")).toBeInTheDocument();
      expect(screen.getByText("1 done")).toBeInTheDocument();
      expect(screen.getByText("1 failed")).toBeInTheDocument();
    });

    it("shows progress bar for processing items", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "processing",
          filePath: "/tmp/test",
          progress: {
            step: "transcribing",
            message: "Processing audio...",
            progress: 50,
            total: 100,
          },
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      // Should show step-level label instead of raw message
      expect(
        screen.getByText(/Transcribing\s+.*\s*step 3\/7/),
      ).toBeInTheDocument();
      // Progress bar should be at 50%
      const progressBar = document.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("shows error message for failed items", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "failed",
          filePath: "/tmp/test",
          error: "Transcription failed: API error",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(
        screen.getByText("Transcription failed: API error"),
      ).toBeInTheDocument();
    });

    it("shows View Notes button for completed items with resultFolderId", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "completed",
          filePath: "/tmp/test",
          resultFolderId: "folder-123",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
          onViewNotes={mockOnViewNotes}
        />,
      );

      const viewButton = screen.getByTitle("View notes");
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onRemoveItem when X clicked", () => {
      const queueState = createQueueState([
        {
          id: "item-1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "pending",
          filePath: "/tmp/test",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      const removeButton = screen.getByTitle("Remove");
      fireEvent.click(removeButton);

      expect(mockOnRemoveItem).toHaveBeenCalledWith("item-1");
    });

    it("calls onRetryItem when retry clicked", () => {
      const queueState = createQueueState([
        {
          id: "item-2",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "failed",
          error: "Error",
          filePath: "/tmp/test",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      const retryButton = screen.getByTitle("Retry");
      fireEvent.click(retryButton);

      expect(mockOnRetryItem).toHaveBeenCalledWith("item-2");
    });

    it("calls onViewNotes when view notes clicked", () => {
      const queueState = createQueueState([
        {
          id: "item-3",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "completed",
          filePath: "/tmp/test",
          resultFolderId: "folder-xyz",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
          onViewNotes={mockOnViewNotes}
        />,
      );

      const viewButton = screen.getByTitle("View notes");
      fireEvent.click(viewButton);

      expect(mockOnViewNotes).toHaveBeenCalledWith("folder-xyz");
    });

    it("calls onClearCompleted when clear completed clicked", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "completed",
          filePath: "/tmp/test",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      const clearButton = screen.getByText("Clear completed");
      fireEvent.click(clearButton);

      expect(mockOnClearCompleted).toHaveBeenCalled();
    });

    it("toggles expanded state when header clicked", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "pending",
          filePath: "/tmp/test",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      // Initially expanded - file name should be visible
      expect(screen.getByText("test.mp4")).toBeInTheDocument();

      // Click header to collapse
      const header = screen.getByText("Processing Queue").closest("button");
      fireEvent.click(header!);

      // Items should be hidden after collapse
      expect(screen.queryByText("test.mp4")).not.toBeInTheDocument();

      // Click again to expand
      fireEvent.click(header!);

      // Items visible again
      expect(screen.getByText("test.mp4")).toBeInTheDocument();
    });
  });

  describe("Step-level progress display", () => {
    it("shows step label for transcribing step", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "lecture.mp4",
          fileSize: 5000,
          status: "processing",
          filePath: "/tmp/lecture",
          progress: {
            step: "transcribing",
            message: "Transcribing audio chunks...",
            progress: 3,
            total: 10,
          },
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(
        screen.getByText(/Transcribing\s+.*\s*step 3\/7/),
      ).toBeInTheDocument();
    });

    it("shows step label for summarizing step", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "lecture.mp4",
          fileSize: 5000,
          status: "processing",
          filePath: "/tmp/lecture",
          progress: {
            step: "summarizing",
            message: "Generating summary...",
          },
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(
        screen.getByText(/Generating Notes\s+.*\s*step 4\/7/),
      ).toBeInTheDocument();
    });

    it("shows raw progress.message for unknown step values", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "lecture.mp4",
          fileSize: 5000,
          status: "processing",
          filePath: "/tmp/lecture",
          progress: {
            step: "loading",
            message: "Loading video data...",
          },
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(screen.getByText("Loading video data...")).toBeInTheDocument();
      expect(screen.queryByText(/step \d+\/7/)).not.toBeInTheDocument();
    });

    it("shows Processing... fallback when no progress object exists", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "lecture.mp4",
          fileSize: 5000,
          status: "processing",
          filePath: "/tmp/lecture",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("does not show step display for completed items", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "lecture.mp4",
          fileSize: 5000,
          status: "completed",
          filePath: "/tmp/lecture",
          progress: {
            step: "finalizing",
            message: "Done",
          },
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(screen.queryByText(/step \d+\/7/)).not.toBeInTheDocument();
      expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
    });
  });

  describe("No remove button for processing items", () => {
    it("does not show remove button for processing items", () => {
      const queueState = createQueueState([
        {
          id: "1",
          originalFileName: "test.mp4",
          fileSize: 1000,
          status: "processing",
          filePath: "/tmp/test",
        },
      ]);

      render(
        <QueuePanel
          queueState={queueState}
          onRemoveItem={mockOnRemoveItem}
          onRetryItem={mockOnRetryItem}
          onClearCompleted={mockOnClearCompleted}
        />,
      );

      expect(screen.queryByTitle("Remove")).not.toBeInTheDocument();
    });
  });
});
