import { describe, it, expect } from "vitest";
import { CREATE_ARTIFACT_TOOL, isArtifactToolUse } from "../tool-calling";
import type Anthropic from "@anthropic-ai/sdk";

describe("tool-calling", () => {
  describe("CREATE_ARTIFACT_TOOL", () => {
    it("should have correct tool name", () => {
      expect(CREATE_ARTIFACT_TOOL.name).toBe("save_artifact");
    });

    it("should have a description", () => {
      expect(CREATE_ARTIFACT_TOOL.description).toBeDefined();
      expect(CREATE_ARTIFACT_TOOL.description!.length).toBeGreaterThan(0);
    });

    it("should have correct input schema structure", () => {
      const schema = CREATE_ARTIFACT_TOOL.input_schema;
      expect(schema.type).toBe("object");
      expect(schema.required).toContain("title");
      expect(schema.required).toContain("content");
    });

    it("should define title property in schema", () => {
      const properties = CREATE_ARTIFACT_TOOL.input_schema.properties as Record<
        string,
        { type: string; description: string }
      >;
      expect(properties.title).toBeDefined();
      expect(properties.title.type).toBe("string");
    });

    it("should define content property in schema", () => {
      const properties = CREATE_ARTIFACT_TOOL.input_schema.properties as Record<
        string,
        { type: string; description: string }
      >;
      expect(properties.content).toBeDefined();
      expect(properties.content.type).toBe("string");
    });
  });

  describe("isArtifactToolUse", () => {
    it("should return true for save_artifact tool use block", () => {
      const block: Anthropic.ToolUseBlock = {
        type: "tool_use",
        id: "test-id",
        name: "save_artifact",
        input: { title: "Test", content: "Content" },
      };
      expect(isArtifactToolUse(block)).toBe(true);
    });

    it("should return false for different tool name", () => {
      const block: Anthropic.ToolUseBlock = {
        type: "tool_use",
        id: "test-id",
        name: "other_tool",
        input: { foo: "bar" },
      };
      expect(isArtifactToolUse(block)).toBe(false);
    });

    it("should return false for text block", () => {
      const block = {
        type: "text" as const,
        text: "Hello world",
      };
      expect(isArtifactToolUse(block as Anthropic.TextBlock)).toBe(false);
    });
  });
});
