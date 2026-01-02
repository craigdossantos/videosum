import { NextRequest, NextResponse } from "next/server";
import { getQueueItem, removeFromQueue, updateQueueItem } from "@/lib/queue";
import { getQueueProcessor } from "@/lib/queue-processor";

// GET: Get item status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await getQueueItem(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Cancel/remove item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await getQueueItem(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // If item is currently processing, cancel it
    if (item.status === "processing") {
      const processor = getQueueProcessor();
      if (processor.getCurrentItemId() === id) {
        await processor.cancelCurrent();
        return NextResponse.json({ success: true, action: "cancelled" });
      }
    }

    // Otherwise, remove from queue
    const removed = await removeFromQueue(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Failed to remove item" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, action: "removed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Retry a failed item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await getQueueItem(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.status !== "failed" && item.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only failed or cancelled items can be retried" },
        { status: 400 },
      );
    }

    // Reset item to pending
    await updateQueueItem(id, {
      status: "pending",
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
      progress: undefined,
    });

    // Start the processor if not already running
    const processor = getQueueProcessor();
    processor.start();

    return NextResponse.json({ success: true, action: "retried" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
