/**
 * File system implementation of ArtifactStorage.
 * Stores each artifact as an individual markdown file with YAML frontmatter.
 * This makes artifacts portable, readable, and easy to use with other tools.
 *
 * Structure:
 *   ~/VideoSum/School/2025-12-30 - Lecture Title/
 *   └── artifacts/
 *       ├── summary-key-concepts.md
 *       └── study-guide.md
 *
 * Each file has YAML frontmatter with metadata:
 *   ---
 *   id: art_abc123
 *   title: Summary of Key Concepts
 *   created: 2025-12-30T10:30:00Z
 *   prompt: Create a summary
 *   ---
 *   # Summary content...
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Artifact, CreateArtifactInput } from "./types";
import { ArtifactStorage } from "./storage";

/**
 * Sanitize a title for use as a filename
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid chars
    .replace(/\s+/g, "-") // Spaces to dashes
    .replace(/-+/g, "-") // Multiple dashes to single
    .replace(/^-|-$/g, "") // Trim dashes
    .slice(0, 50); // Limit length
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

/**
 * Generate YAML frontmatter for an artifact
 */
function generateFrontmatter(artifact: Artifact): string {
  const lines = [
    "---",
    `id: ${artifact.id}`,
    `title: ${artifact.title}`,
    `created: ${artifact.createdAt}`,
  ];
  if (artifact.prompt) {
    // Escape quotes in prompt for YAML
    const escapedPrompt = artifact.prompt.replace(/"/g, '\\"');
    lines.push(`prompt: "${escapedPrompt}"`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

/**
 * Create a file-system-based artifact storage.
 * @param baseDir - The base directory where context folders are stored
 */
export function createFileStorage(baseDir: string): ArtifactStorage {
  const getArtifactsDir = (contextId: string) =>
    path.join(baseDir, contextId, "artifacts");

  return {
    async list(contextId) {
      const artifactsDir = getArtifactsDir(contextId);

      try {
        const files = await fs.readdir(artifactsDir);
        const mdFiles = files.filter((f) => f.endsWith(".md"));

        const artifacts: Artifact[] = [];

        for (const file of mdFiles) {
          try {
            const content = await fs.readFile(
              path.join(artifactsDir, file),
              "utf-8",
            );
            const { frontmatter, body } = parseFrontmatter(content);

            if (frontmatter.id && frontmatter.title) {
              artifacts.push({
                id: frontmatter.id,
                title: frontmatter.title,
                content: body.trim(),
                createdAt: frontmatter.created || new Date().toISOString(),
                prompt: frontmatter.prompt,
              });
            }
          } catch {
            // Skip files that can't be read
            continue;
          }
        }

        // Sort by creation date, newest first
        artifacts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        return artifacts;
      } catch {
        // Directory doesn't exist
        return [];
      }
    },

    async save(contextId, input) {
      const artifactsDir = getArtifactsDir(contextId);
      await fs.mkdir(artifactsDir, { recursive: true });

      const artifact: Artifact = {
        id: `art_${randomUUID().slice(0, 8)}`,
        ...input,
        createdAt: new Date().toISOString(),
      };

      // Generate filename from title
      const filename = `${sanitizeFilename(artifact.title)}.md`;
      const filePath = path.join(artifactsDir, filename);

      // Check if file exists and add suffix if needed
      let finalPath = filePath;
      let counter = 1;
      while (true) {
        try {
          await fs.access(finalPath);
          // File exists, try with counter
          const base = sanitizeFilename(artifact.title);
          finalPath = path.join(artifactsDir, `${base}-${counter}.md`);
          counter++;
        } catch {
          // File doesn't exist, use this path
          break;
        }
      }

      // Write file with frontmatter
      const content = generateFrontmatter(artifact) + artifact.content;
      await fs.writeFile(finalPath, content, "utf-8");

      return artifact;
    },

    async delete(contextId, artifactId) {
      const artifactsDir = getArtifactsDir(contextId);

      try {
        const files = await fs.readdir(artifactsDir);

        for (const file of files) {
          if (!file.endsWith(".md")) continue;

          const content = await fs.readFile(
            path.join(artifactsDir, file),
            "utf-8",
          );
          const { frontmatter } = parseFrontmatter(content);

          if (frontmatter.id === artifactId) {
            await fs.unlink(path.join(artifactsDir, file));
            return;
          }
        }
      } catch {
        // Directory doesn't exist or file not found
      }
    },
  };
}
