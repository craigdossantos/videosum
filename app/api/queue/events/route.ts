import { loadQueue } from "@/lib/queue";
import { getQueueProcessor, type QueueEvent } from "@/lib/queue-processor";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const initialState = await loadQueue();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "state", state: initialState })}\n\n`,
        ),
      );

      // Subscribe to processor events
      const processor = getQueueProcessor();
      const unsubscribe = processor.onEvent((event: QueueEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Stream closed
        }
      });

      // Start processor if there are pending items
      if (initialState.items.some((item) => item.status === "pending")) {
        processor.start();
      }

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Stream closed
          clearInterval(heartbeat);
        }
      }, 30000);

      // Store cleanup for when stream closes
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
