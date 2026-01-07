import { createFileStorage } from "../file-storage";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

describe("file-storage", () => {
  let testDir: string;
  let storage: ReturnType<typeof createFileStorage>;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = path.join(tmpdir(), `ai-artifacts-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    storage = createFileStorage(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createFileStorage", () => {
    it("should create a storage instance with required methods", () => {
      expect(storage).toBeDefined();
      expect(typeof storage.list).toBe("function");
      expect(typeof storage.save).toBe("function");
      expect(typeof storage.delete).toBe("function");
    });
  });

  describe("save", () => {
    it("should save an artifact and return it with generated id", async () => {
      const input = {
        title: "Test Artifact",
        content: "# Test Content\n\nThis is a test.",
        prompt: "Create a test",
      };

      const artifact = await storage.save("context-1", input);

      expect(artifact.id).toBeDefined();
      expect(artifact.id).toMatch(/^art_/);
      expect(artifact.title).toBe(input.title);
      expect(artifact.content).toBe(input.content);
      expect(artifact.prompt).toBe(input.prompt);
      expect(artifact.createdAt).toBeDefined();
    });

    it("should create artifacts.json file in context directory", async () => {
      await storage.save("context-1", {
        title: "Test",
        content: "Content",
        prompt: "Test prompt",
      });

      const filePath = path.join(testDir, "context-1", "artifacts.json");
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should persist artifact data to file", async () => {
      const input = {
        title: "Persisted Artifact",
        content: "Persisted content",
        prompt: "Persist test",
      };

      await storage.save("context-1", input);

      const filePath = path.join(testDir, "context-1", "artifacts.json");
      const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

      expect(data.version).toBe(1);
      expect(data.artifacts).toHaveLength(1);
      expect(data.artifacts[0].title).toBe(input.title);
    });

    it("should append to existing artifacts", async () => {
      await storage.save("context-1", {
        title: "First",
        content: "First content",
        prompt: "First prompt",
      });
      await storage.save("context-1", {
        title: "Second",
        content: "Second content",
        prompt: "Second prompt",
      });

      const artifacts = await storage.list("context-1");
      expect(artifacts).toHaveLength(2);
      // Newest first (unshift behavior)
      expect(artifacts[0].title).toBe("Second");
      expect(artifacts[1].title).toBe("First");
    });
  });

  describe("list", () => {
    it("should return empty array for non-existent context", async () => {
      const artifacts = await storage.list("non-existent");
      expect(artifacts).toEqual([]);
    });

    it("should return all saved artifacts for a context", async () => {
      await storage.save("context-1", {
        title: "Artifact 1",
        content: "Content 1",
        prompt: "Prompt 1",
      });
      await storage.save("context-1", {
        title: "Artifact 2",
        content: "Content 2",
        prompt: "Prompt 2",
      });

      const artifacts = await storage.list("context-1");

      expect(artifacts).toHaveLength(2);
      // Newest first (unshift behavior)
      expect(artifacts.map((a) => a.title)).toEqual([
        "Artifact 2",
        "Artifact 1",
      ]);
    });

    it("should isolate artifacts between contexts", async () => {
      await storage.save("context-1", {
        title: "Context 1 Artifact",
        content: "Content",
        prompt: "Prompt",
      });
      await storage.save("context-2", {
        title: "Context 2 Artifact",
        content: "Content",
        prompt: "Prompt",
      });

      const context1Artifacts = await storage.list("context-1");
      const context2Artifacts = await storage.list("context-2");

      expect(context1Artifacts).toHaveLength(1);
      expect(context1Artifacts[0].title).toBe("Context 1 Artifact");
      expect(context2Artifacts).toHaveLength(1);
      expect(context2Artifacts[0].title).toBe("Context 2 Artifact");
    });
  });

  describe("delete", () => {
    it("should remove artifact by id", async () => {
      const artifact = await storage.save("context-1", {
        title: "To Delete",
        content: "Content",
        prompt: "Prompt",
      });

      await storage.delete("context-1", artifact.id);

      const artifacts = await storage.list("context-1");
      expect(artifacts).toHaveLength(0);
    });

    it("should only delete specified artifact", async () => {
      const artifact1 = await storage.save("context-1", {
        title: "Keep",
        content: "Content 1",
        prompt: "Prompt 1",
      });
      const artifact2 = await storage.save("context-1", {
        title: "Delete",
        content: "Content 2",
        prompt: "Prompt 2",
      });

      await storage.delete("context-1", artifact2.id);

      const artifacts = await storage.list("context-1");
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].id).toBe(artifact1.id);
      expect(artifacts[0].title).toBe("Keep");
    });

    it("should handle deleting non-existent artifact gracefully", async () => {
      await storage.save("context-1", {
        title: "Exists",
        content: "Content",
        prompt: "Prompt",
      });

      // Should not throw
      await expect(
        storage.delete("context-1", "non-existent-id"),
      ).resolves.not.toThrow();

      const artifacts = await storage.list("context-1");
      expect(artifacts).toHaveLength(1);
    });

    it("should handle deleting from non-existent context", async () => {
      // Should not throw
      await expect(
        storage.delete("non-existent-context", "some-id"),
      ).resolves.not.toThrow();
    });
  });
});
