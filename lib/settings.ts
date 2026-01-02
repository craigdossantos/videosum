import { homedir } from "os";
import { join } from "path";

/**
 * Get the notes output directory from environment variable or default.
 * Expands ~ to home directory.
 */
export async function getNotesDirectory(): Promise<string> {
  const configDir = process.env.CLASS_NOTES_DIR || "~/ClassNotes";
  return configDir.replace(/^~/, homedir());
}

/**
 * Get the queue storage directory.
 */
export function getQueueDirectory(): string {
  return join(homedir(), ".videosum");
}
