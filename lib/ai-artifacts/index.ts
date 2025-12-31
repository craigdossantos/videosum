/**
 * AI Artifacts Module
 *
 * A reusable module for adding AI-powered artifact creation to any project.
 * Works with any context (video transcripts, documents, conversations, etc.)
 *
 * Usage:
 * ```typescript
 * import { Artifact, ArtifactStorage, createFileStorage } from '@/lib/ai-artifacts';
 * ```
 */

// Types
export type {
  Artifact,
  CreateArtifactInput,
  InfographicArtifact,
} from "./types";

// Storage
export type { ArtifactStorage } from "./storage";
export { createFileStorage } from "./file-storage";

// Tool calling
export {
  CREATE_ARTIFACT_TOOL,
  isArtifactToolUse,
  type ArtifactToolInput,
} from "./tool-calling";
