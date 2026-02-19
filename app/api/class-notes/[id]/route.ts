import { NextRequest, NextResponse } from "next/server";
import { readFile, access, rm } from "fs/promises";
import { resolve, join } from "path";
import { getNotesDirectory } from "@/lib/settings";
import { removeVideoFromAllFolders } from "@/lib/folders";

function resolveVideoPath(outputDir: string, id: string): string | null {
  const fullPath = resolve(join(outputDir, id));
  const resolvedBase = resolve(outputDir);
  if (!fullPath.startsWith(resolvedBase + "/") && fullPath !== resolvedBase) {
    return null;
  }
  return fullPath;
}

interface ClassMetadata {
  title: string;
  source_file: string;
  source_hash: string;
  duration_seconds: number;
  processed_at: string;
  costs: {
    transcription: number;
    summarization: number;
    total: number;
  };
}

interface ClassNotes extends ClassMetadata {
  id: string;
  markdown: string; // AI-generated summary (for download)
  transcriptHtml: string; // Full transcript HTML (for viewing)
  blogMarkdown?: string; // Blog post markdown (optional, may not exist for older entries)
}

async function readFileOrFallback(
  primary: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(primary, "utf-8");
  } catch {
    return await readFile(fallback, "utf-8");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // ID can be a path like "School/Math 101/2025-12-30 - Lecture"
    // Decode URL-encoded characters
    const decodedId = decodeURIComponent(id);
    const outputDir = await getNotesDirectory();
    const classDir = resolveVideoPath(outputDir, decodedId);

    if (!classDir) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if directory exists
    try {
      await access(classDir);
    } catch {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Read all files in parallel
    // transcript.html is new format, notes.html is old format (fallback)
    // blog.md is optional (may not exist for older entries)
    const [metadataContent, markdown, transcriptHtml, blogMarkdown] =
      await Promise.all([
        readFile(join(classDir, "metadata.json"), "utf-8"),
        readFile(join(classDir, "notes.md"), "utf-8"),
        readFileOrFallback(
          join(classDir, "transcript.html"),
          join(classDir, "notes.html"),
        ),
        readFile(join(classDir, "blog.md"), "utf-8").catch(() => null),
      ]);

    const metadata: ClassMetadata = JSON.parse(metadataContent);

    const response: ClassNotes = {
      id,
      ...metadata,
      markdown,
      transcriptHtml,
      ...(blogMarkdown && { blogMarkdown }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Notes error:", error);
    return NextResponse.json(
      { error: "Failed to load class notes" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const outputDir = await getNotesDirectory();
    const fullPath = resolveVideoPath(outputDir, decodedId);

    if (!fullPath) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Always clean up folders.json, even if the folder is already gone from disk
    await removeVideoFromAllFolders(decodedId);

    // Attempt to remove from disk — force: true means no error if already gone
    await rm(fullPath, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 },
    );
  }
}
