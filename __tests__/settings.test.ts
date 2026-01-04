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
    it("returns default ~/ClassNotes when env var not set", async () => {
      delete process.env.CLASS_NOTES_DIR;

      const { getNotesDirectory } = await import("../lib/settings");
      const dir = await getNotesDirectory();

      expect(dir).toBe(path.join(os.homedir(), "ClassNotes"));
    });

    it("returns env var value with ~ expanded", async () => {
      process.env.CLASS_NOTES_DIR = "~/CustomNotes";

      const { getNotesDirectory } = await import("../lib/settings");
      const dir = await getNotesDirectory();

      expect(dir).toBe(path.join(os.homedir(), "CustomNotes"));
    });

    it("returns env var value without ~ as-is", async () => {
      process.env.CLASS_NOTES_DIR = "/absolute/path/to/notes";

      const { getNotesDirectory } = await import("../lib/settings");
      const dir = await getNotesDirectory();

      expect(dir).toBe("/absolute/path/to/notes");
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
