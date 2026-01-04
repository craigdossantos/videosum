import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

// Data structures
export interface QueueItemProgress {
  step: string;
  message: string;
  progress?: number;
  total?: number;
}

export interface QueueItem {
  id: string;
  filePath: string; // Temp file path
  originalFileName: string;
  fileSize: number;
  folder?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: QueueItemProgress;
  error?: string;
  resultFolderId?: string;
}

export interface QueueState {
  items: QueueItem[];
  isProcessing: boolean;
  currentItemId?: string;
  lastUpdated: string;
}

// Storage location
const VIDEOSUM_DIR = path.join(os.homedir(), ".videosum");
const QUEUE_FILE = path.join(VIDEOSUM_DIR, "queue.json");

async function ensureDir(): Promise<void> {
  await fs.mkdir(VIDEOSUM_DIR, { recursive: true });
}

function getEmptyState(): QueueState {
  return {
    items: [],
    isProcessing: false,
    lastUpdated: new Date().toISOString(),
  };
}

export async function loadQueue(): Promise<QueueState> {
  try {
    await ensureDir();
    const data = await fs.readFile(QUEUE_FILE, "utf-8");
    const state: QueueState = JSON.parse(data);

    // On load, reset any "processing" items to "pending" (app restart recovery)
    state.items = state.items.map((item) => {
      if (item.status === "processing") {
        return {
          ...item,
          status: "pending" as const,
          startedAt: undefined,
          progress: undefined,
        };
      }
      return item;
    });
    state.isProcessing = false;
    state.currentItemId = undefined;
    state.lastUpdated = new Date().toISOString();

    return state;
  } catch {
    // File doesn't exist or is invalid - return empty state
    return getEmptyState();
  }
}

export async function saveQueue(state: QueueState): Promise<void> {
  await ensureDir();
  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(QUEUE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export interface AddToQueueInput {
  filePath: string;
  originalFileName: string;
  fileSize: number;
  folder?: string;
}

export async function addToQueue(
  inputs: AddToQueueInput[],
): Promise<QueueItem[]> {
  const state = await loadQueue();

  const newItems: QueueItem[] = inputs.map((input) => ({
    id: uuidv4(),
    filePath: input.filePath,
    originalFileName: input.originalFileName,
    fileSize: input.fileSize,
    folder: input.folder,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  }));

  state.items.push(...newItems);
  await saveQueue(state);

  return newItems;
}

export async function updateQueueItem(
  id: string,
  updates: Partial<QueueItem>,
): Promise<QueueItem | null> {
  const state = await loadQueue();
  const index = state.items.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  state.items[index] = { ...state.items[index], ...updates };
  await saveQueue(state);

  return state.items[index];
}

export async function removeFromQueue(id: string): Promise<boolean> {
  const state = await loadQueue();
  const initialLength = state.items.length;
  state.items = state.items.filter((item) => item.id !== id);

  if (state.items.length === initialLength) {
    return false;
  }

  await saveQueue(state);
  return true;
}

export async function getNextPendingItem(): Promise<QueueItem | null> {
  const state = await loadQueue();
  return state.items.find((item) => item.status === "pending") || null;
}

export async function getQueueItem(id: string): Promise<QueueItem | null> {
  const state = await loadQueue();
  return state.items.find((item) => item.id === id) || null;
}

export async function clearCompleted(): Promise<number> {
  const state = await loadQueue();
  const initialLength = state.items.length;
  state.items = state.items.filter((item) => item.status !== "completed");
  await saveQueue(state);
  return initialLength - state.items.length;
}

export async function setProcessingState(
  isProcessing: boolean,
  currentItemId?: string,
): Promise<void> {
  const state = await loadQueue();
  state.isProcessing = isProcessing;
  state.currentItemId = currentItemId;
  await saveQueue(state);
}
