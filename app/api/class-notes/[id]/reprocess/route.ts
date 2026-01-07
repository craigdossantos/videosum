import { NextRequest, NextResponse } from "next/server";
import { addReprocessItem } from "@/lib/queue";
import { getQueueProcessor } from "@/lib/queue-processor";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Load existing metadata to verify the folder exists
    const notesBaseDir =
      process.env.NOTES_BASE_DIR ||
      path.join(process.env.HOME!, "Dropbox/ClassNotes");
    const notesDir = path.join(notesBaseDir, id);

    // Check folder exists
    try {
      await fs.stat(notesDir);
    } catch {
      return NextResponse.json(
        { error: "Notes folder not found" },
        { status: 404 },
      );
    }

    // Check that transcript exists (we won't redo this)
    const transcriptPath = path.join(notesDir, "transcript.txt");
    try {
      await fs.stat(transcriptPath);
    } catch {
      return NextResponse.json(
        { error: "Transcript not found - cannot reprocess" },
        { status: 400 },
      );
    }

    // Add reprocess item to queue
    const item = await addReprocessItem(id, notesDir);

    // Trigger processor to start if not already running
    const processor = getQueueProcessor();
    await processor.start();

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        status: item.status,
      },
    });
  } catch (error) {
    console.error("Reprocess error:", error);
    return NextResponse.json(
      { error: "Failed to queue reprocess" },
      { status: 500 },
    );
  }
}
