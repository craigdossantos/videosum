import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "os";
import path from "path";

describe("Settings Module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getNotesDirectory", () => {
    it("returns default ~/VideoSum when env var not set", async () => {
      delete process.env.CLASS_NOTES_DIR;

      const { getNotesDirectory } = await import("../lib/settings");
      const dir = await getNotesDirectory();

      expect(dir).toBe(path.join(os.homedir(), "VideoSum"));
    });

    it("uses env var value as the directory", async () => {
      process.env.CLASS_NOTES_DIR = path.join(os.homedir(), "CustomNotes");

      const { getNotesDirectory } = await import("../lib/settings");
      const dir = await getNotesDirectory();

      expect(dir).toBe(path.join(os.homedir(), "CustomNotes"));
    });
  });

  describe("getQueueDirectory", () => {
    it("returns ~/.videosum directory", async () => {
      const { getQueueDirectory } = await import("../lib/settings");
      const dir = getQueueDirectory();

      expect(dir).toBe(path.join(os.homedir(), ".videosum"));
    });
  });
});
