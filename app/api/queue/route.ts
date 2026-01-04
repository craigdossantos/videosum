import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { loadQueue, addToQueue, clearCompleted } from "@/lib/queue";
import { getQueueProcessor } from "@/lib/queue-processor";

const UPLOAD_DIR = "/tmp/class-notes-uploads";

// GET: Return current queue state
export async function GET() {
  try {
    const state = await loadQueue();
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Add files to queue (FormData with multiple files)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const folder = formData.get("folder") as string | null;

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate file types
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];

    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid file types: ${invalidFiles.map((f) => f.name).join(", ")}. Please upload MP4, WebM, MOV, or AVI.`,
        },
        { status: 400 },
      );
    }

    // Save files to temp location and build queue inputs
    await mkdir(UPLOAD_DIR, { recursive: true });

    const queueInputs = await Promise.all(
      files.map(async (file) => {
        const tempPath = join(UPLOAD_DIR, `${randomUUID()}-${file.name}`);
        const bytes = await file.arrayBuffer();
        await writeFile(tempPath, Buffer.from(bytes));

        return {
          filePath: tempPath,
          originalFileName: file.name,
          fileSize: file.size,
          folder: folder || undefined,
        };
      }),
    );

    // Add to queue
    const addedItems = await addToQueue(queueInputs);

    // Start the processor if not already running
    const processor = getQueueProcessor();
    processor.start();

    return NextResponse.json({
      success: true,
      added: addedItems.length,
      items: addedItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Clear completed items
export async function DELETE() {
  try {
    const cleared = await clearCompleted();

    // Broadcast state update to all connected clients
    const processor = getQueueProcessor();
    await processor.broadcastState();

    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
