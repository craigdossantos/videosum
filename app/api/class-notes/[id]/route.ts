import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || "~/ClassNotes";
  return configDir.replace(/^~/, homedir());
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
  blogMarkdown?: string; // AI-generated blog post
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

async function readOptionalFile(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const outputDir = getOutputDir();
    const classDir = join(outputDir, id);

    // Check if directory exists
    try {
      await access(classDir);
    } catch {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Read all files in parallel
    // transcript.html is new format, notes.html is old format (fallback)
    // blog.md is optional (only exists for newly processed videos)
    const [metadataContent, markdown, transcriptHtml, blogMarkdown] =
      await Promise.all([
        readFile(join(classDir, "metadata.json"), "utf-8"),
        readFile(join(classDir, "notes.md"), "utf-8"),
        readFileOrFallback(
          join(classDir, "transcript.html"),
          join(classDir, "notes.html"),
        ),
        readOptionalFile(join(classDir, "blog.md")),
      ]);

    const metadata: ClassMetadata = JSON.parse(metadataContent);

    const response: ClassNotes = {
      id,
      ...metadata,
      markdown,
      transcriptHtml,
      blogMarkdown,
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
