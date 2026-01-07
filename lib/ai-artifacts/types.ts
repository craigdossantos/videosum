/**
 * Core types for the AI Artifacts module.
 * These types are intentionally generic and domain-agnostic for reusability.
 */

export interface Artifact {
  id: string;
  title: string;
  content: string; // Markdown content
  createdAt: string;
  prompt: string; // Original user request that generated this artifact
}

export interface CreateArtifactInput {
  title: string;
  content: string;
  prompt: string;
}

// For future infographic support with NanoBanana
export interface InfographicArtifact extends Artifact {
  imageUrl?: string;
  imageData?: string; // Base64 for local storage
}
