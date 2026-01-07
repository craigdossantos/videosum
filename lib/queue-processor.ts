import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { join } from "path";
import { access, unlink } from "fs/promises";
import {
  loadQueue,
  updateQueueItem,
  getNextPendingItem,
  setProcessingState,
  type QueueItem,
  type QueueState,
  type QueueItemProgress,
} from "./queue";
import { getNotesDirectory } from "./settings";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export type QueueEventType =
  | "state"
  | "progress"
  | "itemComplete"
  | "itemFailed"
  | "itemCancelled";

export interface QueueEvent {
  type: QueueEventType;
  state?: QueueState;
  item?: QueueItem;
  progress?: QueueItemProgress;
  error?: string;
  resultFolderId?: string;
}

class QueueProcessor {
  private static instance: QueueProcessor;
  private isRunning: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private currentItemId: string | null = null;
  private emitter: EventEmitter = new EventEmitter();
  private processingPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): QueueProcessor {
    if (!QueueProcessor.instance) {
      QueueProcessor.instance = new QueueProcessor();
    }
    return QueueProcessor.instance;
  }

  onEvent(callback: (event: QueueEvent) => void): () => void {
    this.emitter.on("event", callback);
    return () => this.emitter.off("event", callback);
  }

  private emit(event: QueueEvent): void {
    this.emitter.emit("event", event);
  }

  private async emitState(): Promise<void> {
    const state = await loadQueue();
    this.emit({ type: "state", state });
  }

  // Public method to broadcast state updates (e.g., after manual item removal)
  async broadcastState(): Promise<void> {
    await this.emitState();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[queue-processor] Already running, skipping start");
      return;
    }
    console.log("[queue-processor] Starting processor loop");
    this.isRunning = true;
    this.processingPromise = this.processLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.processingPromise) {
      await this.processingPromise;
      this.processingPromise = null;
    }
  }

  async cancelCurrent(): Promise<void> {
    if (this.currentProcess && this.currentItemId) {
      this.currentProcess.kill("SIGTERM");
      await updateQueueItem(this.currentItemId, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
      });
      const item = await import("./queue").then((q) =>
        q.getQueueItem(this.currentItemId!),
      );
      if (item) {
        this.emit({ type: "itemCancelled", item });
      }
      await this.emitState();
    }
  }

  private async processLoop(): Promise<void> {
    console.log("[queue-processor] Process loop started");
    while (this.isRunning) {
      const item = await getNextPendingItem();

      if (!item) {
        // No items to process, wait and check again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      console.log(
        `[queue-processor] Processing item: ${item.originalFileName}`,
      );
      await this.processItem(item);
    }

    console.log("[queue-processor] Process loop ended");
    await setProcessingState(false);
    await this.emitState();
  }

  private async processItem(item: QueueItem): Promise<void> {
    this.currentItemId = item.id;

    // Mark item as processing
    await updateQueueItem(item.id, {
      status: "processing",
      startedAt: new Date().toISOString(),
    });
    await setProcessingState(true, item.id);
    await this.emitState();

    try {
      const result = await this.runPythonProcess(item);

      await updateQueueItem(item.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        resultFolderId: result.folderId,
      });

      const completedItem = await import("./queue").then((q) =>
        q.getQueueItem(item.id),
      );
      if (completedItem) {
        this.emit({
          type: "itemComplete",
          item: completedItem,
          resultFolderId: result.folderId,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await updateQueueItem(item.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: errorMessage,
      });

      const failedItem = await import("./queue").then((q) =>
        q.getQueueItem(item.id),
      );
      if (failedItem) {
        this.emit({
          type: "itemFailed",
          item: failedItem,
          error: errorMessage,
        });
      }
    } finally {
      this.currentItemId = null;
      this.currentProcess = null;
      await setProcessingState(false);
      await this.emitState();
    }
  }

  private async runPythonProcess(
    item: QueueItem,
  ): Promise<{ folderId: string }> {
    const outputDir = await getNotesDirectory();
    const scriptPath = join(process.cwd(), "scripts", "process_video.py");
    const venvDir = [".", "venv"].join(""); // ".venv"
    const pythonPath = join(process.cwd(), venvDir, "bin", "python3");

    // Check Python venv exists
    if (!(await fileExists(pythonPath))) {
      throw new Error(
        `Python virtual environment not found at ${venvDir}. Run: python3 -m venv ${venvDir} && source ${venvDir}/bin/activate && pip install python-dotenv openai anthropic`,
      );
    }

    return new Promise((resolve, reject) => {
      // Build args based on whether this is a reprocess job
      const args = item.isReprocess
        ? [scriptPath, item.filePath, "--reprocess"]
        : [scriptPath, item.filePath, outputDir];

      // Only add --folder for regular processing (not reprocess)
      if (!item.isReprocess && item.folder) {
        args.push("--folder", item.folder);
      }

      const pythonProcess = spawn(pythonPath, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
      });

      this.currentProcess = pythonProcess;
      let stdout = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("PROGRESS:")) {
            const progressJson = line.substring(9);
            try {
              const progress = JSON.parse(progressJson);
              // Update item progress and emit
              updateQueueItem(item.id, { progress }).then(() => {
                this.emit({ type: "progress", item, progress });
              });
            } catch {
              console.log("[queue-processor]", line);
            }
          } else if (line.trim()) {
            console.log("[queue-processor]", line);
          }
        }
      });

      pythonProcess.on("close", async (code) => {
        // Clean up temp file (only for regular processing, not reprocess)
        if (!item.isReprocess) {
          await unlink(item.filePath).catch(() => {});
        }

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            if (result.status === "success" && result.folder_id) {
              resolve({ folderId: result.folder_id });
            } else if (result.status === "error") {
              reject(new Error(result.message || "Processing failed"));
            } else {
              reject(new Error("Invalid result format"));
            }
          } catch {
            reject(new Error("Failed to parse result"));
          }
        } else {
          // Try to parse JSON error from stdout
          try {
            const parsed = JSON.parse(stdout);
            if (parsed.status === "error") {
              reject(new Error(parsed.message || "Processing failed"));
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          } catch {
            reject(new Error(`Process exited with code ${code}`));
          }
        }
      });

      pythonProcess.on("error", async (err) => {
        // Clean up temp file (only for regular processing, not reprocess)
        if (!item.isReprocess) {
          await unlink(item.filePath).catch(() => {});
        }
        reject(new Error(`Failed to start process: ${err.message}`));
      });
    });
  }

  isCurrentlyProcessing(): boolean {
    return this.isRunning && this.currentItemId !== null;
  }

  getCurrentItemId(): string | null {
    return this.currentItemId;
  }
}

// Export singleton getter
export function getQueueProcessor(): QueueProcessor {
  return QueueProcessor.getInstance();
}
