import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export interface Folder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  videoIds: string[];
}

export interface FoldersData {
  folders: Folder[];
}

export interface FolderWithMeta extends Folder {
  videoCount: number;
  hasOverview?: boolean;
  hasCombinedBlog?: boolean;
}

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || '~/ClassNotes';
  return configDir.replace(/^~/, homedir());
}

function getFoldersPath(): string {
  return join(getOutputDir(), 'folders.json');
}

function getFolderContentDir(folderId: string): string {
  return join(getOutputDir(), '_folders', folderId);
}

/**
 * Read folders.json, creating it if it doesn't exist
 */
export async function getFoldersData(): Promise<FoldersData> {
  const foldersPath = getFoldersPath();
  try {
    const content = await readFile(foldersPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // File doesn't exist, return empty structure
    return { folders: [] };
  }
}

/**
 * Write folders.json
 */
async function saveFoldersData(data: FoldersData): Promise<void> {
  const foldersPath = getFoldersPath();
  await writeFile(foldersPath, JSON.stringify(data, null, 2));
}

/**
 * Generate a URL-safe ID from a name
 */
function generateId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

/**
 * Get all folders with metadata
 */
export async function getFolders(): Promise<FolderWithMeta[]> {
  const data = await getFoldersData();
  const outputDir = getOutputDir();

  return Promise.all(
    data.folders.map(async (folder) => {
      const folderContentDir = getFolderContentDir(folder.id);
      let hasOverview = false;
      let hasCombinedBlog = false;

      try {
        await readFile(join(folderContentDir, 'overview.md'), 'utf-8');
        hasOverview = true;
      } catch {}

      try {
        await readFile(join(folderContentDir, 'combined-blog.md'), 'utf-8');
        hasCombinedBlog = true;
      } catch {}

      return {
        ...folder,
        videoCount: folder.videoIds.length,
        hasOverview,
        hasCombinedBlog,
      };
    })
  );
}

/**
 * Get a single folder by ID
 */
export async function getFolder(id: string): Promise<Folder | null> {
  const data = await getFoldersData();
  return data.folders.find((f) => f.id === id) || null;
}

/**
 * Create a new folder
 */
export async function createFolder(
  name: string,
  description?: string
): Promise<Folder> {
  const data = await getFoldersData();

  const folder: Folder = {
    id: generateId(name),
    name,
    description,
    createdAt: new Date().toISOString(),
    videoIds: [],
  };

  data.folders.push(folder);
  await saveFoldersData(data);

  return folder;
}

/**
 * Update a folder's name or description
 */
export async function updateFolder(
  id: string,
  updates: { name?: string; description?: string }
): Promise<Folder | null> {
  const data = await getFoldersData();
  const folderIndex = data.folders.findIndex((f) => f.id === id);

  if (folderIndex === -1) return null;

  if (updates.name !== undefined) {
    data.folders[folderIndex].name = updates.name;
  }
  if (updates.description !== undefined) {
    data.folders[folderIndex].description = updates.description;
  }

  await saveFoldersData(data);
  return data.folders[folderIndex];
}

/**
 * Delete a folder (doesn't delete videos)
 */
export async function deleteFolder(id: string): Promise<boolean> {
  const data = await getFoldersData();
  const folderIndex = data.folders.findIndex((f) => f.id === id);

  if (folderIndex === -1) return false;

  data.folders.splice(folderIndex, 1);
  await saveFoldersData(data);

  return true;
}

/**
 * Add a video to a folder
 */
export async function addVideoToFolder(
  folderId: string,
  videoId: string
): Promise<boolean> {
  const data = await getFoldersData();
  const folder = data.folders.find((f) => f.id === folderId);

  if (!folder) return false;

  if (!folder.videoIds.includes(videoId)) {
    folder.videoIds.push(videoId);
    await saveFoldersData(data);
  }

  return true;
}

/**
 * Remove a video from a folder
 */
export async function removeVideoFromFolder(
  folderId: string,
  videoId: string
): Promise<boolean> {
  const data = await getFoldersData();
  const folder = data.folders.find((f) => f.id === folderId);

  if (!folder) return false;

  const videoIndex = folder.videoIds.indexOf(videoId);
  if (videoIndex !== -1) {
    folder.videoIds.splice(videoIndex, 1);
    await saveFoldersData(data);
  }

  return true;
}

/**
 * Reorder videos in a folder
 */
export async function reorderVideosInFolder(
  folderId: string,
  videoIds: string[]
): Promise<boolean> {
  const data = await getFoldersData();
  const folder = data.folders.find((f) => f.id === folderId);

  if (!folder) return false;

  // Validate that all provided IDs exist in the folder
  const existingIds = new Set(folder.videoIds);
  const newIds = new Set(videoIds);

  if (existingIds.size !== newIds.size) return false;
  for (const id of existingIds) {
    if (!newIds.has(id)) return false;
  }

  folder.videoIds = videoIds;
  await saveFoldersData(data);

  return true;
}

/**
 * Get all video IDs that are in any folder
 */
export async function getOrganizedVideoIds(): Promise<Set<string>> {
  const data = await getFoldersData();
  const ids = new Set<string>();

  for (const folder of data.folders) {
    for (const videoId of folder.videoIds) {
      ids.add(videoId);
    }
  }

  return ids;
}

/**
 * Get folder content (overview and combined blog)
 */
export async function getFolderContent(folderId: string): Promise<{
  overview?: string;
  combinedBlog?: string;
}> {
  const folderContentDir = getFolderContentDir(folderId);
  const result: { overview?: string; combinedBlog?: string } = {};

  try {
    result.overview = await readFile(join(folderContentDir, 'overview.md'), 'utf-8');
  } catch {}

  try {
    result.combinedBlog = await readFile(join(folderContentDir, 'combined-blog.md'), 'utf-8');
  } catch {}

  return result;
}

/**
 * Save folder content (after generation)
 */
export async function saveFolderContent(
  folderId: string,
  content: { overview?: string; combinedBlog?: string }
): Promise<void> {
  const folderContentDir = getFolderContentDir(folderId);

  // Ensure directory exists
  await mkdir(folderContentDir, { recursive: true });

  if (content.overview) {
    await writeFile(join(folderContentDir, 'overview.md'), content.overview);
  }
  if (content.combinedBlog) {
    await writeFile(join(folderContentDir, 'combined-blog.md'), content.combinedBlog);
  }
}
