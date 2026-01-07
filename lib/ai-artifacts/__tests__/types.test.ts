import { describe, it, expect } from "vitest";
import type {
  Artifact,
  CreateArtifactInput,
  InfographicArtifact,
} from "../types";

describe("types", () => {
  describe("Artifact", () => {
    it("should accept valid artifact structure", () => {
      const artifact: Artifact = {
        id: "art_123",
        title: "Test Artifact",
        content: "# Markdown content",
        createdAt: "2024-01-01T00:00:00Z",
        prompt: "Create something",
      };

      expect(artifact.id).toBe("art_123");
      expect(artifact.title).toBe("Test Artifact");
      expect(artifact.content).toBe("# Markdown content");
      expect(artifact.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(artifact.prompt).toBe("Create something");
    });

    it("should require prompt field", () => {
      const artifact: Artifact = {
        id: "art_123",
        title: "Test",
        content: "Content",
        createdAt: "2024-01-01T00:00:00Z",
        prompt: "Test prompt",
      };

      expect(artifact.prompt).toBe("Test prompt");
    });
  });

  describe("CreateArtifactInput", () => {
    it("should accept valid input structure", () => {
      const input: CreateArtifactInput = {
        title: "New Artifact",
        content: "Some content",
        prompt: "User prompt",
      };

      expect(input.title).toBe("New Artifact");
      expect(input.content).toBe("Some content");
      expect(input.prompt).toBe("User prompt");
    });

    it("should require prompt", () => {
      const input: CreateArtifactInput = {
        title: "New Artifact",
        content: "Some content",
        prompt: "Create this artifact",
      };

      expect(input.prompt).toBe("Create this artifact");
    });
  });

  describe("InfographicArtifact", () => {
    it("should extend Artifact with image fields", () => {
      const infographic: InfographicArtifact = {
        id: "art_456",
        title: "Infographic",
        content: "# Visual content",
        createdAt: "2024-01-01T00:00:00Z",
        prompt: "Create an infographic",
        imageUrl: "https://example.com/image.png",
      };

      expect(infographic.imageUrl).toBe("https://example.com/image.png");
      expect(infographic.imageData).toBeUndefined();
    });

    it("should accept base64 image data", () => {
      const infographic: InfographicArtifact = {
        id: "art_789",
        title: "Infographic with Data",
        content: "Content",
        createdAt: "2024-01-01T00:00:00Z",
        prompt: "Generate image",
        imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      };

      expect(infographic.imageData).toBeDefined();
      expect(infographic.imageUrl).toBeUndefined();
    });
  });
});
