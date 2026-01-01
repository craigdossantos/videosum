import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, relative } from "path";
import { getNotesDirectory } from "@/lib/settings";
import { glob } from "glob";

interface ClassMetadata {
  title: string;
  source_file: string;
  source_hash: string;
  duration_seconds: number;
  processed_at: string;
  subfolder?: string;
  relative_path?: string;
  costs: {
    transcription: number;
    summarization: number;
    total: number;
  };
}

interface ClassRecord extends ClassMetadata {
  id: string;
  folderPath: string;
}

export async function GET() {
  try {
    const outputDir = await getNotesDirectory();

    // Find all metadata.json files recursively
    let metadataFiles: string[];
    try {
      metadataFiles = await glob("**/metadata.json", {
        cwd: outputDir,
        ignore: ["**/node_modules/**", "**/.git/**"],
      });
    } catch {
      // Directory doesn't exist yet, return empty array
      return NextResponse.json([]);
    }

    const classes: ClassRecord[] = [];

    for (const metadataPath of metadataFiles) {
      const fullPath = join(outputDir, metadataPath);
      const folderPath = metadataPath.replace("/metadata.json", "");

      try {
        const content = await readFile(fullPath, "utf-8");
        const metadata: ClassMetadata = JSON.parse(content);

        // Use relative path as ID for compatibility
        const id = folderPath;

        classes.push({
          id,
          folderPath,
          ...metadata,
        });
      } catch {
        // Skip folders without valid metadata
        continue;
      }
    }

    // Sort by processed_at descending (newest first)
    classes.sort(
      (a, b) =>
        new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime(),
    );

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Library error:", error);
    return NextResponse.json([]);
  }
}
