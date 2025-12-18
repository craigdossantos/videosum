import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || '~/ClassNotes';
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

interface ClassRecord extends ClassMetadata {
  id: string;
}

export async function GET() {
  try {
    const outputDir = getOutputDir();

    let folders;
    try {
      folders = await readdir(outputDir, { withFileTypes: true });
    } catch {
      // Directory doesn't exist yet, return empty array
      return NextResponse.json([]);
    }

    const classes: ClassRecord[] = [];

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;

      const metadataPath = join(outputDir, folder.name, 'metadata.json');
      try {
        const content = await readFile(metadataPath, 'utf-8');
        const metadata: ClassMetadata = JSON.parse(content);
        classes.push({
          id: folder.name,
          ...metadata,
        });
      } catch {
        // Skip folders without valid metadata
        continue;
      }
    }

    // Sort by processed_at descending (newest first)
    classes.sort((a, b) =>
      new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
    );

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Library error:', error);
    return NextResponse.json([]);
  }
}
