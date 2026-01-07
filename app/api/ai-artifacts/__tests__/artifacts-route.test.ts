/**
 * Tests for the artifacts CRUD API route
 * Tests the route handlers by mocking the storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";

describe("artifacts API route", () => {
  let testDir: string;
  let GET: typeof import("../[contextId]/artifacts/route").GET;
  let POST: typeof import("../[contextId]/artifacts/route").POST;
  let DELETE: typeof import("../[contextId]/artifacts/route").DELETE;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = path.join(tmpdir(), `api-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set environment before importing
    process.env.CLASS_NOTES_DIR = testDir;

    // Clear the module cache and re-import
    vi.resetModules();
    const routeModule = await import("../[contextId]/artifacts/route");
    GET = routeModule.GET;
    POST = routeModule.POST;
    DELETE = routeModule.DELETE;
  });

  afterEach(async () => {
    delete process.env.CLASS_NOTES_DIR;
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("GET /api/ai-artifacts/[contextId]/artifacts", () => {
    it("should return empty artifacts array for new context", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.artifacts).toEqual([]);
    });

    it("should return saved artifacts", async () => {
      // First create an artifact via the API
      const createRequest = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Test Artifact",
            content: "# Test Content",
            prompt: "Test prompt",
          }),
        },
      );
      const createParams = Promise.resolve({ contextId: "test-context" });
      await POST(createRequest, { params: createParams });

      // Now list artifacts
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.artifacts).toHaveLength(1);
      expect(data.artifacts[0].title).toBe("Test Artifact");
    });
  });

  describe("POST /api/ai-artifacts/[contextId]/artifacts", () => {
    it("should create a new artifact", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            title: "New Artifact",
            content: "# Content",
            prompt: "Create something",
          }),
        },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.artifact).toBeDefined();
      expect(data.artifact.title).toBe("New Artifact");
      expect(data.artifact.content).toBe("# Content");
      expect(data.artifact.id).toMatch(/^art_/);
    });

    it("should return 400 if title is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            content: "# Content",
          }),
        },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title and content are required");
    });

    it("should return 400 if content is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Title Only",
          }),
        },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Title and content are required");
    });

    it("should persist artifact to file system", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Persisted",
            content: "Content",
            prompt: "Prompt",
          }),
        },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      await POST(request, { params });

      // Verify artifact file was created in artifacts directory
      const artifactsDir = path.join(testDir, "test-context", "artifacts");
      const files = await fs.readdir(artifactsDir);
      expect(files).toHaveLength(1);

      const content = await fs.readFile(
        path.join(artifactsDir, files[0]),
        "utf-8",
      );
      expect(content).toContain("title: Persisted");
    });
  });

  describe("DELETE /api/ai-artifacts/[contextId]/artifacts", () => {
    it("should delete an artifact by id", async () => {
      // First create an artifact
      const createRequest = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        {
          method: "POST",
          body: JSON.stringify({
            title: "To Delete",
            content: "Content",
            prompt: "Prompt",
          }),
        },
      );
      const createParams = Promise.resolve({ contextId: "test-context" });
      const createResponse = await POST(createRequest, {
        params: createParams,
      });
      const createData = await createResponse.json();
      const artifactId = createData.artifact.id;

      // Delete the artifact
      const request = new NextRequest(
        `http://localhost:3000/api/ai-artifacts/test-context/artifacts?id=${artifactId}`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's actually deleted
      const listRequest = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
      );
      const listParams = Promise.resolve({ contextId: "test-context" });
      const listResponse = await GET(listRequest, { params: listParams });
      const listData = await listResponse.json();
      expect(listData.artifacts).toHaveLength(0);
    });

    it("should return 400 if artifact id is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/test-context/artifacts",
        { method: "DELETE" },
      );
      const params = Promise.resolve({ contextId: "test-context" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Artifact ID is required");
    });
  });
});
