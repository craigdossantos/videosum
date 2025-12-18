import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
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

interface ClassNotes extends ClassMetadata {
  id: string;
  markdown: string;
  html: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const outputDir = getOutputDir();
    const classDir = join(outputDir, id);

    // Check if directory exists
    try {
      await access(classDir);
    } catch {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Read all files in parallel
    const [metadataContent, markdown, html] = await Promise.all([
      readFile(join(classDir, 'metadata.json'), 'utf-8'),
      readFile(join(classDir, 'notes.md'), 'utf-8'),
      readFile(join(classDir, 'notes.html'), 'utf-8'),
    ]);

    const metadata: ClassMetadata = JSON.parse(metadataContent);

    const response: ClassNotes = {
      id,
      ...metadata,
      markdown,
      html,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notes error:', error);
    return NextResponse.json(
      { error: 'Failed to load class notes' },
      { status: 500 }
    );
  }
}
