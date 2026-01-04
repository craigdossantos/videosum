import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock the fs module
vi.mock("fs/promises");
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// Import after mocking
import {
  loadQueue,
  saveQueue,
  addToQueue,
  updateQueueItem,
  removeFromQueue,
  getNextPendingItem,
  getQueueItem,
  clearCompleted,
  setProcessingState,
  type QueueState,
  type QueueItem,
} from "../lib/queue";

const VIDEOSUM_DIR = path.join(os.homedir(), ".videosum");
const QUEUE_FILE = path.join(VIDEOSUM_DIR, "queue.json");

describe("Queue Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for mkdir
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("loadQueue", () => {
    it("returns empty state when queue file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const state = await loadQueue();

      expect(state.items).toEqual([]);
      expect(state.isProcessing).toBe(false);
      expect(state.lastUpdated).toBeDefined();
    });

    it("loads and parses existing queue file", async () => {
      const mockState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "pending",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockState));

      const state = await loadQueue();

      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("item-1");
      expect(state.items[0].status).toBe("pending");
    });

    it("resets processing items to pending on load (app restart recovery)", async () => {
      const mockState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "processing",
            createdAt: "2024-01-01T00:00:00Z",
            startedAt: "2024-01-01T00:01:00Z",
            progress: { step: "transcribing", message: "Working..." },
          },
        ],
        isProcessing: true,
        currentItemId: "item-1",
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockState));

      const state = await loadQueue();

      expect(state.items[0].status).toBe("pending");
      expect(state.items[0].startedAt).toBeUndefined();
      expect(state.items[0].progress).toBeUndefined();
      expect(state.isProcessing).toBe(false);
      expect(state.currentItemId).toBeUndefined();
    });
  });

  describe("saveQueue", () => {
    it("writes state to queue file", async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const state: QueueState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      await saveQueue(state);

      expect(fs.mkdir).toHaveBeenCalledWith(VIDEOSUM_DIR, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        QUEUE_FILE,
        expect.any(String),
        "utf-8",
      );
    });
  });

  describe("addToQueue", () => {
    it("adds new items to the queue", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const inputs = [
        {
          filePath: "/tmp/video1.mp4",
          originalFileName: "video1.mp4",
          fileSize: 1000,
        },
        {
          filePath: "/tmp/video2.mp4",
          originalFileName: "video2.mp4",
          fileSize: 2000,
          folder: "lectures",
        },
      ];

      const newItems = await addToQueue(inputs);

      expect(newItems).toHaveLength(2);
      expect(newItems[0].status).toBe("pending");
      expect(newItems[0].originalFileName).toBe("video1.mp4");
      expect(newItems[1].folder).toBe("lectures");
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it("preserves existing items when adding new ones", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "existing-1",
            filePath: "/tmp/old.mp4",
            originalFileName: "old.mp4",
            fileSize: 500,
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const inputs = [
        {
          filePath: "/tmp/new.mp4",
          originalFileName: "new.mp4",
          fileSize: 1000,
        },
      ];

      await addToQueue(inputs);

      // Check that writeFile was called with state containing both items
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedState = JSON.parse(writeCall[1] as string);
      expect(savedState.items).toHaveLength(2);
    });
  });

  describe("updateQueueItem", () => {
    it("updates an existing item", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "pending",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const updated = await updateQueueItem("item-1", {
        status: "processing",
        startedAt: "2024-01-01T00:01:00Z",
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("processing");
      expect(updated?.startedAt).toBe("2024-01-01T00:01:00Z");
    });

    it("returns null for non-existent item", async () => {
      const existingState: QueueState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const updated = await updateQueueItem("non-existent", {
        status: "processing",
      });

      expect(updated).toBeNull();
    });
  });

  describe("removeFromQueue", () => {
    it("removes an existing item", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "pending",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const removed = await removeFromQueue("item-1");

      expect(removed).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedState = JSON.parse(writeCall[1] as string);
      expect(savedState.items).toHaveLength(0);
    });

    it("returns false for non-existent item", async () => {
      const existingState: QueueState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const removed = await removeFromQueue("non-existent");

      expect(removed).toBe(false);
    });
  });

  describe("getNextPendingItem", () => {
    it("returns first pending item", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video1.mp4",
            originalFileName: "video1.mp4",
            fileSize: 1000,
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "item-2",
            filePath: "/tmp/video2.mp4",
            originalFileName: "video2.mp4",
            fileSize: 2000,
            status: "pending",
            createdAt: "2024-01-01T00:01:00Z",
          },
          {
            id: "item-3",
            filePath: "/tmp/video3.mp4",
            originalFileName: "video3.mp4",
            fileSize: 3000,
            status: "pending",
            createdAt: "2024-01-01T00:02:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const nextItem = await getNextPendingItem();

      expect(nextItem).not.toBeNull();
      expect(nextItem?.id).toBe("item-2");
    });

    it("returns null when no pending items", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const nextItem = await getNextPendingItem();

      expect(nextItem).toBeNull();
    });
  });

  describe("getQueueItem", () => {
    it("returns item by ID", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video.mp4",
            originalFileName: "video.mp4",
            fileSize: 1000,
            status: "pending",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const item = await getQueueItem("item-1");

      expect(item).not.toBeNull();
      expect(item?.originalFileName).toBe("video.mp4");
    });

    it("returns null for non-existent ID", async () => {
      const existingState: QueueState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));

      const item = await getQueueItem("non-existent");

      expect(item).toBeNull();
    });
  });

  describe("clearCompleted", () => {
    it("removes all completed items", async () => {
      const existingState: QueueState = {
        items: [
          {
            id: "item-1",
            filePath: "/tmp/video1.mp4",
            originalFileName: "video1.mp4",
            fileSize: 1000,
            status: "completed",
            createdAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "item-2",
            filePath: "/tmp/video2.mp4",
            originalFileName: "video2.mp4",
            fileSize: 2000,
            status: "pending",
            createdAt: "2024-01-01T00:01:00Z",
          },
          {
            id: "item-3",
            filePath: "/tmp/video3.mp4",
            originalFileName: "video3.mp4",
            fileSize: 3000,
            status: "completed",
            createdAt: "2024-01-01T00:02:00Z",
          },
        ],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const clearedCount = await clearCompleted();

      expect(clearedCount).toBe(2);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedState = JSON.parse(writeCall[1] as string);
      expect(savedState.items).toHaveLength(1);
      expect(savedState.items[0].id).toBe("item-2");
    });
  });

  describe("setProcessingState", () => {
    it("updates processing state", async () => {
      const existingState: QueueState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingState));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await setProcessingState(true, "item-1");

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedState = JSON.parse(writeCall[1] as string);
      expect(savedState.isProcessing).toBe(true);
      expect(savedState.currentItemId).toBe("item-1");
    });
  });
});
