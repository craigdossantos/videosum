/**
 * App settings management
 * Handles user preferences including the notes directory location
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";

export interface AppSettings {
  notesDirectory: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
}

const DEFAULT_NOTES_DIR = path.join(os.homedir(), "VideoSum");
const SETTINGS_FILE = "settings.json";

// Get the settings file path (inside the notes directory)
function getSettingsPath(notesDir: string): string {
  return path.join(notesDir, SETTINGS_FILE);
}

// Get the global config path for initial bootstrap
function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".videosum", "config.json");
}

/**
 * Get the queue storage directory.
 */
export function getQueueDirectory(): string {
  return path.join(os.homedir(), ".videosum");
}

/**
 * Load app settings
 * Checks global config first, then settings in notes directory
 */
export async function loadSettings(): Promise<AppSettings> {
  const defaults: AppSettings = {
    notesDirectory: process.env.CLASS_NOTES_DIR || DEFAULT_NOTES_DIR,
  };

  // Try to load from global config first (for bootstrap)
  try {
    const globalConfig = await fs.readFile(getGlobalConfigPath(), "utf-8");
    const parsed = JSON.parse(globalConfig);
    if (parsed.notesDirectory) {
      defaults.notesDirectory = parsed.notesDirectory;
    }
    if (parsed.ANTHROPIC_API_KEY) {
      defaults.anthropicApiKey = parsed.ANTHROPIC_API_KEY;
    }
    if (parsed.OPENAI_API_KEY) {
      defaults.openaiApiKey = parsed.OPENAI_API_KEY;
    }
  } catch {
    // Global config doesn't exist, use defaults
  }

  // Try to load settings from notes directory
  try {
    const settingsPath = getSettingsPath(defaults.notesDirectory);
    const content = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(content) as Partial<AppSettings>;
    return { ...defaults, ...settings };
  } catch {
    // Settings file doesn't exist, return defaults
    return defaults;
  }
}

/**
 * Save app settings
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  // Ensure notes directory exists
  await fs.mkdir(settings.notesDirectory, { recursive: true });

  // Save to notes directory
  const settingsPath = getSettingsPath(settings.notesDirectory);
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

  // Also update global config for bootstrap
  const globalConfigDir = path.dirname(getGlobalConfigPath());
  await fs.mkdir(globalConfigDir, { recursive: true });

  const globalConfig: Record<string, string> = {
    notesDirectory: settings.notesDirectory,
  };
  if (settings.anthropicApiKey) {
    globalConfig.ANTHROPIC_API_KEY = settings.anthropicApiKey;
  }
  if (settings.openaiApiKey) {
    globalConfig.OPENAI_API_KEY = settings.openaiApiKey;
  }

  await fs.writeFile(
    getGlobalConfigPath(),
    JSON.stringify(globalConfig, null, 2),
  );
}

/**
 * Get the notes directory, creating it if needed
 */
export async function getNotesDirectory(): Promise<string> {
  const settings = await loadSettings();
  await fs.mkdir(settings.notesDirectory, { recursive: true });
  return settings.notesDirectory;
}

/**
 * Sanitize a string for use as a folder/file name
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Create a readable folder name from date and title
 */
export function createReadableFolderName(title: string, date?: Date): string {
  const dateStr = (date || new Date()).toISOString().split("T")[0];
  const sanitizedTitle = sanitizeFileName(title);
  return `${dateStr} - ${sanitizedTitle}`;
}

/**
 * List all folders in the notes directory (for folder picker)
 */
export async function listFolders(basePath?: string): Promise<string[]> {
  const notesDir = basePath || (await getNotesDirectory());

  try {
    const entries = await fs.readdir(notesDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Check if a path is a video note folder (has metadata.json)
 */
export async function isVideoNoteFolder(folderPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(folderPath, "metadata.json"));
    return true;
  } catch {
    return false;
  }
}
