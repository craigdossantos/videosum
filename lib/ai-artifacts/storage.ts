/**
 * Storage interface for artifacts.
 * This abstraction allows different implementations (file system, database, API, etc.)
 */

import { Artifact, CreateArtifactInput } from "./types";

export interface ArtifactStorage {
  /**
   * List all artifacts for a given context (e.g., a video, document, etc.)
   */
  list(contextId: string): Promise<Artifact[]>;

  /**
   * Save a new artifact
   */
  save(contextId: string, input: CreateArtifactInput): Promise<Artifact>;

  /**
   * Delete an artifact by ID
   */
  delete(contextId: string, artifactId: string): Promise<void>;
}
