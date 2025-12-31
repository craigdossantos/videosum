/**
 * Claude tool definition for artifact creation.
 * Uses Claude's tool use feature for structured artifact generation.
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definition for saving artifacts.
 * Claude will call this tool when the user asks to create/generate content.
 */
export const CREATE_ARTIFACT_TOOL: Anthropic.Tool = {
  name: "save_artifact",
  description:
    "Save content as a reusable artifact when the user asks you to create, generate, or make something they might want to keep (learning points, summaries, blog posts, study guides, etc.)",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "A descriptive title for the artifact",
      },
      content: {
        type: "string",
        description: "The full markdown content of the artifact",
      },
    },
    required: ["title", "content"],
  },
};

export interface ArtifactToolInput {
  title: string;
  content: string;
}

/**
 * Type guard to check if a content block is an artifact tool use
 */
export function isArtifactToolUse(
  block: Anthropic.ContentBlock,
): block is Anthropic.ToolUseBlock & { name: "save_artifact" } {
  return block.type === "tool_use" && block.name === "save_artifact";
}
