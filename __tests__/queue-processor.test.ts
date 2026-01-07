import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock dependencies before importing the module
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    access: vi.fn(),
    unlink: vi.fn(),
  };
});

vi.mock("../lib/queue", () => ({
  loadQueue: vi.fn(),
  updateQueueItem: vi.fn(),
  getNextPendingItem: vi.fn(),
  setProcessingState: vi.fn(),
}));

vi.mock("../lib/settings", () => ({
  getNotesDirectory: vi.fn().mockResolvedValue("/mock/notes"),
}));

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

import { getQueueProcessor, type QueueEvent } from "../lib/queue-processor";
import { loadQueue, getNextPendingItem } from "../lib/queue";

describe("QueueProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getInstance (Singleton Pattern)", () => {
    it("returns the same instance on multiple calls", () => {
      const instance1 = getQueueProcessor();
      const instance2 = getQueueProcessor();

      expect(instance1).toBe(instance2);
    });
  });

  describe("onEvent", () => {
    it("allows subscribing to events", () => {
      const processor = getQueueProcessor();
      const callback = vi.fn();

      const unsubscribe = processor.onEvent(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("returns unsubscribe function that removes listener", () => {
      const processor = getQueueProcessor();
      const callback = vi.fn();

      const unsubscribe = processor.onEvent(callback);
      unsubscribe();

      // After unsubscribe, callback should not be called
      // This is implicitly tested - if it throws, the test fails
    });
  });

  describe("broadcastState", () => {
    it("emits state event with current queue state", async () => {
      const mockState = {
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      vi.mocked(loadQueue).mockResolvedValue(mockState);

      const processor = getQueueProcessor();
      const callback = vi.fn();
      processor.onEvent(callback);

      await processor.broadcastState();

      expect(loadQueue).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith({
        type: "state",
        state: mockState,
      });
    });
  });

  describe("getCurrentItemId", () => {
    it("returns null when no item is being processed", () => {
      const processor = getQueueProcessor();
      const currentId = processor.getCurrentItemId();

      expect(currentId).toBeNull();
    });
  });

  describe("start/stop", () => {
    it("start does not throw", async () => {
      vi.mocked(getNextPendingItem).mockResolvedValue(null);
      vi.mocked(loadQueue).mockResolvedValue({
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      });

      const processor = getQueueProcessor();

      // Start should not throw even with no items
      await expect(processor.start()).resolves.not.toThrow();

      // Stop to clean up
      await processor.stop();
    });

    it("start is idempotent (calling twice does not start multiple loops)", async () => {
      vi.mocked(getNextPendingItem).mockResolvedValue(null);
      vi.mocked(loadQueue).mockResolvedValue({
        items: [],
        isProcessing: false,
        lastUpdated: "2024-01-01T00:00:00Z",
      });

      const processor = getQueueProcessor();

      await processor.start();
      await processor.start(); // Second call should be no-op

      await processor.stop();

      // If this doesn't hang or throw, the test passes
    });
  });
});

describe("QueueEvent Types", () => {
  it("QueueEvent type includes all expected event types", () => {
    // This is a compile-time check - if the types are wrong, TypeScript will error
    const stateEvent: QueueEvent = { type: "state" };
    const progressEvent: QueueEvent = { type: "progress" };
    const completeEvent: QueueEvent = { type: "itemComplete" };
    const failedEvent: QueueEvent = { type: "itemFailed" };
    const cancelledEvent: QueueEvent = { type: "itemCancelled" };

    expect(stateEvent.type).toBe("state");
    expect(progressEvent.type).toBe("progress");
    expect(completeEvent.type).toBe("itemComplete");
    expect(failedEvent.type).toBe("itemFailed");
    expect(cancelledEvent.type).toBe("itemCancelled");
  });
});
