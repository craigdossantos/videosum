# feat: Class Notes Extractor - Simplified Implementation

**Date Created**: December 10, 2025
**Status**: Ready for Implementation
**Complexity**: Medium (Single Python script + Next.js integration)
**Estimated Cost per Class**: ~$1.50 (2hr video)

---

## Overview

Build a local web application that processes video recordings of classes (meditation, NVC, cooking, etc.) and extracts well-formatted notes. The app provides an interactive Q&A interface powered by Claude.

### Core Flow
```
Upload video → Extract audio → Whisper API → Single Claude call → HTML notes → Done
```

### What We're Building (MVP)
- **Input**: Video files (MP4, WebM, MOV)
- **Output**: Formatted HTML/Markdown notes saved to `~/ClassNotes/`
- **Q&A**: Ask Claude questions about the notes
- **Duplicate Detection**: Don't reprocess videos you've already done

### What We're NOT Building (Deferred)
- ~~Speaker diarization~~ (Teacher vs Student identification)
- ~~Local Whisper~~ (API only for MVP)
- ~~Chunked processing~~ (Single Claude call with full transcript)
- ~~Mid-processing checkpoints~~ (Simple duplicate detection only)
- ~~Elaborate progress tracking~~ (Simple "processing..." status)
- ~~Job cancellation~~ (Let it complete or fail)

---

## Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js App (existing)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Upload Page  │  │ Library View │  │ Notes Viewer + Q&A    │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/process-video (Next.js API Route)                    │   │
│  │   → spawn('python3', ['scripts/process_video.py', ...])   │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ /api/chat (Next.js API Route)                             │   │
│  │   → Claude API with notes as context                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    File System Storage                          │
│  ~/ClassNotes/                                                  │
│  ├── 2024-01-15-meditation-fundamentals/                       │
│  │   ├── notes.html         (self-contained, viewable)         │
│  │   ├── notes.md           (markdown source)                  │
│  │   ├── transcript.txt     (raw transcript)                   │
│  │   └── metadata.json      (title, cost, hash)                │
│  └── 2024-02-20-nvc-workshop/                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Simplification**: No separate FastAPI backend. Python script called via subprocess from Next.js API routes.

---

## Technical Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | Existing Next.js | Leverage existing shadcn/ui components |
| Processing | Python script (subprocess) | Called from Next.js API route |
| Transcription | OpenAI Whisper API | ~$0.006/min, fast |
| Summarization | Claude Sonnet 4 | Single call with full transcript |
| Q&A | Claude API via Next.js | Pass full notes as context |
| Storage | File system | Simple folder structure |

### Dependencies

**Python** (minimal):
```txt
# scripts/requirements.txt
openai>=1.55.0
anthropic>=0.40.0
python-dotenv>=1.0.1
```

**System**:
```bash
brew install ffmpeg  # Audio extraction
```

---

## Implementation Phases

### Phase 1: Python Processing Script

**Objective**: One Python script that does everything

**File**: `scripts/process_video.py`

```python
#!/usr/bin/env python3
"""
Process a video file and generate class notes.

Usage:
    python3 process_video.py <video_path> <output_dir>

Example:
    python3 process_video.py ~/Videos/class.mp4 ~/ClassNotes
"""

import sys
import os
import json
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime
from openai import OpenAI
from anthropic import Anthropic

def get_file_hash(file_path: Path) -> str:
    """Generate SHA256 hash of file for duplicate detection."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()[:16]  # First 16 chars is enough

def check_already_processed(output_dir: Path, file_hash: str) -> Path | None:
    """Check if this video was already processed."""
    for folder in output_dir.iterdir():
        if folder.is_dir():
            metadata_file = folder / 'metadata.json'
            if metadata_file.exists():
                metadata = json.loads(metadata_file.read_text())
                if metadata.get('source_hash') == file_hash:
                    return folder
    return None

def extract_audio(video_path: Path, audio_path: Path) -> float:
    """Extract audio from video using ffmpeg. Returns duration in seconds."""
    cmd = [
        'ffmpeg', '-i', str(video_path),
        '-vn', '-acodec', 'mp3', '-ar', '16000', '-ac', '1',
        '-y', str(audio_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    # Get duration
    probe_cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(audio_path)
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    return float(result.stdout.strip())

def transcribe(audio_path: Path) -> tuple[str, float]:
    """Transcribe audio using OpenAI Whisper API. Returns (transcript, cost)."""
    client = OpenAI()

    with open(audio_path, 'rb') as f:
        response = client.audio.transcriptions.create(
            model='whisper-1',
            file=f,
            response_format='text'
        )

    # Cost: $0.006 per minute
    duration_minutes = audio_path.stat().st_size / (16000 * 2 * 60)  # Rough estimate
    cost = duration_minutes * 0.006

    return response, cost

def generate_notes(transcript: str, duration_seconds: int) -> tuple[str, float]:
    """Generate notes using Claude. Returns (markdown_notes, cost)."""
    client = Anthropic()

    duration_str = f"{int(duration_seconds // 3600)}h {int((duration_seconds % 3600) // 60)}m"

    response = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=8192,
        messages=[{
            'role': 'user',
            'content': f"""You are analyzing a class recording transcript. Generate comprehensive, well-organized notes.

TRANSCRIPT ({duration_str}):
{transcript}

Create detailed notes with these sections:

# [Infer an appropriate title from the content]

## Overview
Brief summary of what this class covered and key takeaways.

## Core Concepts
Each major concept explained clearly. Use ### for each concept.

## Stories & Examples
Any illustrative stories, examples, or case studies mentioned.
For each, include the story and the lesson/point it illustrates.

## Exercises & Practices
Step-by-step instructions for any exercises, practices, or techniques taught.
Include purpose, duration if mentioned, and clear instructions.

## Key Insights
Bullet points of the most important takeaways.

---

Be detailed and capture the essence of the class. Do NOT include timestamps or speaker labels.
Format as clean Markdown."""
        }]
    )

    # Cost calculation
    input_cost = (response.usage.input_tokens / 1_000_000) * 3.00
    output_cost = (response.usage.output_tokens / 1_000_000) * 15.00
    cost = input_cost + output_cost

    return response.content[0].text, cost

def generate_html(markdown: str, title: str) -> str:
    """Convert markdown to self-contained HTML."""
    # Simple markdown to HTML (could use markdown library for better conversion)
    import re

    html_body = markdown
    # Basic conversions
    html_body = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_body)
    html_body = re.sub(r'^- (.+)$', r'<li>\1</li>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'\n\n', r'</p><p>', html_body)
    html_body = f'<p>{html_body}</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        :root {{
            --bg: #ffffff;
            --text: #1a1a1a;
            --accent: #2563eb;
            --muted: #666666;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #1a1a1a;
                --text: #e5e7eb;
                --accent: #60a5fa;
                --muted: #9ca3af;
            }}
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            max-width: 750px;
            margin: 0 auto;
            padding: 2rem;
            color: var(--text);
            background: var(--bg);
        }}
        h1 {{ border-bottom: 2px solid var(--accent); padding-bottom: 0.5rem; }}
        h2 {{ color: var(--accent); margin-top: 2.5rem; }}
        h3 {{ color: var(--muted); margin-top: 1.5rem; }}
        li {{ margin: 0.5rem 0; }}
        @media print {{ body {{ max-width: none; }} }}
    </style>
</head>
<body>
{html_body}
</body>
</html>"""

def process_video(video_path: str, output_base: str) -> dict:
    """Main processing function."""
    video_path = Path(video_path).expanduser().resolve()
    output_base = Path(output_base).expanduser().resolve()

    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # Create output directory
    output_base.mkdir(parents=True, exist_ok=True)

    # Check for duplicates
    file_hash = get_file_hash(video_path)
    existing = check_already_processed(output_base, file_hash)
    if existing:
        return {
            'status': 'duplicate',
            'existing_folder': str(existing),
            'message': f'Already processed: {existing.name}'
        }

    # Create output folder
    timestamp = datetime.now().strftime('%Y-%m-%d')
    folder_name = f"{timestamp}-{video_path.stem[:30]}"
    output_folder = output_base / folder_name
    output_folder.mkdir(exist_ok=True)

    print(f"Processing: {video_path.name}", file=sys.stderr)

    # Extract audio
    print("  Extracting audio...", file=sys.stderr)
    audio_path = output_folder / 'audio.mp3'
    duration = extract_audio(video_path, audio_path)

    # Transcribe
    print("  Transcribing...", file=sys.stderr)
    transcript, transcription_cost = transcribe(audio_path)
    (output_folder / 'transcript.txt').write_text(transcript)

    # Generate notes
    print("  Generating notes...", file=sys.stderr)
    notes_md, summarization_cost = generate_notes(transcript, duration)
    (output_folder / 'notes.md').write_text(notes_md)

    # Extract title from notes (first H1)
    import re
    title_match = re.search(r'^# (.+)$', notes_md, re.MULTILINE)
    title = title_match.group(1) if title_match else video_path.stem

    # Generate HTML
    html = generate_html(notes_md, title)
    (output_folder / 'notes.html').write_text(html)

    # Clean up audio file (optional - saves disk space)
    audio_path.unlink()

    # Save metadata
    total_cost = transcription_cost + summarization_cost
    metadata = {
        'title': title,
        'source_file': video_path.name,
        'source_hash': file_hash,
        'duration_seconds': int(duration),
        'processed_at': datetime.now().isoformat(),
        'costs': {
            'transcription': round(transcription_cost, 4),
            'summarization': round(summarization_cost, 4),
            'total': round(total_cost, 4)
        }
    }
    (output_folder / 'metadata.json').write_text(json.dumps(metadata, indent=2))

    print(f"  Done! Cost: ${total_cost:.2f}", file=sys.stderr)

    return {
        'status': 'success',
        'folder': str(output_folder),
        'title': title,
        'cost': total_cost
    }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 process_video.py <video_path> <output_dir>", file=sys.stderr)
        sys.exit(1)

    result = process_video(sys.argv[1], sys.argv[2])
    print(json.dumps(result))
```

#### Tasks
- [ ] Create `scripts/process_video.py` with the above code
- [ ] Create `scripts/requirements.txt`
- [ ] Test with a sample video file
- [ ] Verify duplicate detection works

**Verification**:
```bash
cd scripts
pip install -r requirements.txt
python3 process_video.py ~/Videos/test-class.mp4 ~/ClassNotes
# Should create ~/ClassNotes/2024-12-10-test-class/ with notes
```

---

### Phase 2: Next.js API Routes

**Objective**: API routes that call the Python script and handle Q&A

#### Tasks

- [ ] **2.1 Create process-video API route**

```typescript
// app/api/class-notes/process/route.ts
import { spawn } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
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

    // Save uploaded file to temp location
    await mkdir(UPLOAD_DIR, { recursive: true });
    const tempPath = join(UPLOAD_DIR, `${randomUUID()}-${file.name}`);
    const bytes = await file.arrayBuffer();
    await writeFile(tempPath, Buffer.from(bytes));

    // Call Python script
    const result = await new Promise<string>((resolve, reject) => {
      const process = spawn('python3', [
        'scripts/process_video.py',
        tempPath,
        OUTPUT_DIR
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => { stdout += data; });
      process.stderr.on('data', (data) => { stderr += data; });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });
    });

    // Clean up temp file
    await unlink(tempPath).catch(() => {});

    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **2.2 Create library API route**

```typescript
// app/api/class-notes/library/route.ts
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const OUTPUT_DIR = process.env.CLASS_NOTES_DIR?.replace('~', homedir()) || join(homedir(), 'ClassNotes');

export async function GET() {
  try {
    const folders = await readdir(OUTPUT_DIR, { withFileTypes: true });

    const classes = await Promise.all(
      folders
        .filter(f => f.isDirectory())
        .map(async (folder) => {
          const metadataPath = join(OUTPUT_DIR, folder.name, 'metadata.json');
          try {
            const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
            return {
              id: folder.name,
              ...metadata
            };
          } catch {
            return null;
          }
        })
    );

    return NextResponse.json(classes.filter(Boolean).sort((a, b) =>
      new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
    ));
  } catch (error) {
    return NextResponse.json([]);
  }
}
```

- [ ] **2.3 Create notes API route**

```typescript
// app/api/class-notes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const OUTPUT_DIR = process.env.CLASS_NOTES_DIR?.replace('~', homedir()) || join(homedir(), 'ClassNotes');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classDir = join(OUTPUT_DIR, params.id);

    const [metadata, markdown, html] = await Promise.all([
      readFile(join(classDir, 'metadata.json'), 'utf-8').then(JSON.parse),
      readFile(join(classDir, 'notes.md'), 'utf-8'),
      readFile(join(classDir, 'notes.html'), 'utf-8'),
    ]);

    return NextResponse.json({
      ...metadata,
      id: params.id,
      markdown,
      html
    });
  } catch (error) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
}
```

- [ ] **2.4 Create chat API route**

```typescript
// app/api/class-notes/[id]/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import Anthropic from '@anthropic-ai/sdk';

const OUTPUT_DIR = process.env.CLASS_NOTES_DIR?.replace('~', homedir()) || join(homedir(), 'ClassNotes');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, history = [] } = await request.json();

    // Load notes
    const classDir = join(OUTPUT_DIR, params.id);
    const markdown = await readFile(join(classDir, 'notes.md'), 'utf-8');

    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a helpful assistant discussing a class the user attended.

Here are the complete notes from the class:

${markdown}

Help the user:
- Understand concepts from the class
- Clarify any points they're confused about
- Create quizzes to test their understanding
- Explain how to do the exercises
- Connect ideas across different parts of the class

Be conversational and helpful. Reference specific parts of the notes when relevant.`,
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    });

    return NextResponse.json({
      message: response.content[0].type === 'text' ? response.content[0].text : '',
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Chat failed' },
      { status: 500 }
    );
  }
}
```

**Verification**:
- POST `/api/class-notes/process` with video file works
- GET `/api/class-notes/library` returns processed classes
- GET `/api/class-notes/[id]` returns notes
- POST `/api/class-notes/[id]/chat` returns Claude response

---

### Phase 3: Frontend Pages

**Objective**: Simple UI for upload, library, and viewing notes

#### Tasks

- [ ] **3.1 Create upload & library page**

```tsx
// app/class-notes/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface ClassRecord {
  id: string;
  title: string;
  duration_seconds: number;
  processed_at: string;
  costs: { total: number };
}

export default function ClassNotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: library = [] } = useQuery<ClassRecord[]>({
    queryKey: ['class-notes-library'],
    queryFn: () => fetch('/api/class-notes/library').then(r => r.json()),
  });

  const processMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/class-notes/process', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Processing failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-notes-library'] });
      setFile(null);
    },
  });

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Class Notes Extractor</h1>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Process New Video</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground"
            />

            {file && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{file.name}</span>
                <Button
                  onClick={() => processMutation.mutate(file)}
                  disabled={processMutation.isPending}
                >
                  {processMutation.isPending ? 'Processing...' : 'Generate Notes'}
                </Button>
              </div>
            )}

            {processMutation.isPending && (
              <div className="space-y-2">
                <Progress value={undefined} className="animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  This may take a few minutes...
                </p>
              </div>
            )}

            {processMutation.isSuccess && (
              <p className="text-sm text-green-600">
                Notes generated! Cost: ${processMutation.data.cost?.toFixed(2)}
              </p>
            )}

            {processMutation.isError && (
              <p className="text-sm text-red-600">
                {processMutation.error.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Library Section */}
      <h2 className="text-2xl font-semibold mb-4">Your Class Notes</h2>

      {library.length === 0 ? (
        <p className="text-muted-foreground">No classes processed yet.</p>
      ) : (
        <div className="space-y-4">
          {library.map((cls) => (
            <Link key={cls.id} href={`/class-notes/${cls.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{cls.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(cls.duration_seconds)} •
                        ${cls.costs.total.toFixed(2)} •
                        {new Date(cls.processed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">View Notes</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **3.2 Create notes viewer with Q&A**

```tsx
// app/class-notes/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function NotesViewerPage({ params }: { params: { id: string } }) {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const { data: classData, isLoading } = useQuery({
    queryKey: ['class-notes', params.id],
    queryFn: () => fetch(`/api/class-notes/${params.id}`).then(r => r.json()),
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/class-notes/${params.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: chatHistory }),
      });
      return res.json();
    },
    onSuccess: (data, message) => {
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.message }
      ]);
      setQuestion('');
    },
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!classData) return <div className="p-6">Class not found</div>;

  return (
    <div className="flex h-screen">
      {/* Notes Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/class-notes" className="text-sm text-muted-foreground hover:underline">
            ← Back to Library
          </Link>

          <article className="prose prose-slate dark:prose-invert mt-4">
            <ReactMarkdown>{classData.markdown}</ReactMarkdown>
          </article>
        </div>
      </main>

      {/* Q&A Sidebar */}
      <aside className="w-96 border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Ask Questions</h2>
          <p className="text-sm text-muted-foreground">
            Ask Claude about this class
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-8'
                  : 'bg-muted mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="bg-muted p-3 rounded-lg mr-8 animate-pulse">
              Thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) {
                chatMutation.mutate(question);
              }
            }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending || !question.trim()}>
              Send
            </Button>
          </form>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **3.3 Add react-markdown dependency**

```bash
npm install react-markdown
```

**Verification**:
- Upload page shows file picker and library
- Processing shows progress indicator
- Notes viewer renders markdown
- Q&A chat works

---

## File Structure (Final)

```
videosum/
├── scripts/
│   ├── process_video.py      # Main processing script
│   └── requirements.txt      # Python dependencies
├── app/
│   ├── class-notes/
│   │   ├── page.tsx          # Upload + Library
│   │   └── [id]/
│   │       └── page.tsx      # Notes viewer + Q&A
│   └── api/
│       └── class-notes/
│           ├── process/
│           │   └── route.ts  # Upload & process
│           ├── library/
│           │   └── route.ts  # List classes
│           └── [id]/
│               ├── route.ts  # Get notes
│               └── chat/
│                   └── route.ts  # Q&A
└── ~/ClassNotes/             # Output directory (user's home)
    └── 2024-12-10-meditation-class/
        ├── notes.html
        ├── notes.md
        ├── transcript.txt
        └── metadata.json
```

---

## Environment Variables

```bash
# .env.local (add to existing)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
CLASS_NOTES_DIR=~/ClassNotes
```

---

## Cost Estimate (Simplified)

| Component | Cost |
|-----------|------|
| Whisper API (2hr) | ~$0.72 |
| Claude summarization | ~$0.50-1.00 |
| Q&A (per question) | ~$0.02 |
| **Total per class** | **~$1.50** |

---

## Success Criteria

- [ ] Upload video → get notes in ~/ClassNotes
- [ ] Same video detected as duplicate, not reprocessed
- [ ] Notes are readable and capture key concepts
- [ ] Q&A provides helpful contextual answers
- [ ] Total processing time < 10 minutes for 2hr video

---

## What's Deferred (Post-MVP)

1. **Speaker diarization** - Add if users want Teacher/Student labels
2. **Local Whisper** - Add if API costs become an issue
3. **Chunked processing** - Add if we hit context limits (unlikely)
4. **Progress tracking** - Add step-by-step progress UI
5. **Job cancellation** - Add if users complain about waiting
6. **Error recovery** - Add retry logic as specific errors are discovered

---

*Plan revised: December 10, 2025*
*Version: 2.0 (Simplified)*
