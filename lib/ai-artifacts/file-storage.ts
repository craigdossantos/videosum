/**
 * File system implementation of ArtifactStorage.
 * Stores artifacts in JSON files on the local file system.
 * This is useful for desktop apps (Electron) or local development.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Artifact, CreateArtifactInput } from "./types";
import { ArtifactStorage } from "./storage";

interface ArtifactsFile {
  version: 1;
  artifacts: Artifact[];
}

/**
 * Create a file-system-based artifact storage.
 * @param baseDir - The base directory where context folders are stored
 */
export function createFileStorage(baseDir: string): ArtifactStorage {
  const getPath = (contextId: string) =>
    path.join(baseDir, contextId, "artifacts.json");

  const readFile = async (contextId: string): Promise<ArtifactsFile> => {
    try {
      const data = await fs.readFile(getPath(contextId), "utf-8");
      return JSON.parse(data);
    } catch {
      return { version: 1, artifacts: [] };
    }
  };

  const writeFile = async (contextId: string, data: ArtifactsFile) => {
    await fs.writeFile(getPath(contextId), JSON.stringify(data, null, 2));
  };

  return {
    async list(contextId) {
      const data = await readFile(contextId);
      return data.artifacts;
    },

    async save(contextId, input) {
      const data = await readFile(contextId);
      const artifact: Artifact = {
        id: `art_${randomUUID().slice(0, 8)}`,
        ...input,
        createdAt: new Date().toISOString(),
      };
      data.artifacts.unshift(artifact);
      await writeFile(contextId, data);
      return artifact;
    },

    async delete(contextId, artifactId) {
      const data = await readFile(contextId);
      data.artifacts = data.artifacts.filter((a) => a.id !== artifactId);
      await writeFile(contextId, data);
    },
  };
}
