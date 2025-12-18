import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = '/tmp/class-notes-uploads';
const OUTPUT_DIR = process.env.CLASS_NOTES_DIR || '~/ClassNotes';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload MP4, WebM, MOV, or AVI.' },
        { status: 400 }
      );
    }

    // Save uploaded file to temp location
    await mkdir(UPLOAD_DIR, { recursive: true });
    const tempPath = join(UPLOAD_DIR, `${randomUUID()}-${file.name}`);
    const bytes = await file.arrayBuffer();
    await writeFile(tempPath, Buffer.from(bytes));

    // Get script path relative to project root
    const scriptPath = join(process.cwd(), 'scripts', 'process_video.py');

    // Call Python script
    const result = await new Promise<string>((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, tempPath, OUTPUT_DIR]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data;
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data;
        // Log progress to server console
        console.log('[process_video]', data.toString().trim());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start process: ${err.message}`));
      });
    });

    // Clean up temp file
    await unlink(tempPath).catch(() => {
      // Ignore cleanup errors
    });

    // Parse and return result
    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
