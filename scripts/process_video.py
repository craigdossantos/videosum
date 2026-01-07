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
import re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env.local or .env
env_path = Path(__file__).parent.parent / '.env.local'
if not env_path.exists():
    env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

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
    if not output_dir.exists():
        return None
    for folder in output_dir.iterdir():
        if folder.is_dir():
            metadata_file = folder / 'metadata.json'
            if metadata_file.exists():
                try:
                    metadata = json.loads(metadata_file.read_text())
                    if metadata.get('source_hash') == file_hash:
                        return folder
                except (json.JSONDecodeError, IOError):
                    continue
    return None


def extract_audio(video_path: Path, audio_path: Path) -> float:
    """Extract audio from video using ffmpeg. Returns duration in seconds."""
    # Use 64kbps for better transcription quality
    # For files > 25MB, Whisper API will reject - user should use shorter clips
    # 64kbps * 60sec * 50min / 8 / 1024 = ~23MB (safe for ~50min videos)
    cmd = [
        'ffmpeg', '-i', str(video_path),
        '-vn', '-acodec', 'mp3', '-ar', '16000', '-ac', '1', '-b:a', '64k',
        '-y', str(audio_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")

    # Get duration
    probe_cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(audio_path)
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    return float(result.stdout.strip())


def split_audio(audio_path: Path, max_size_mb: int = 20) -> list[Path]:
    """Split audio file into chunks under max_size_mb. Returns list of chunk paths."""
    file_size = audio_path.stat().st_size
    max_size = max_size_mb * 1024 * 1024

    if file_size <= max_size:
        return [audio_path]

    # Get duration
    probe_cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(audio_path)
    ]
    result = subprocess.run(probe_cmd, capture_output=True, text=True)
    duration = float(result.stdout.strip())

    # Calculate chunk duration based on file size ratio
    num_chunks = int(file_size / max_size) + 1
    chunk_duration = duration / num_chunks

    print(f"  Splitting into {num_chunks} chunks ({chunk_duration/60:.1f} min each)...", file=sys.stderr)

    chunks = []
    for i in range(num_chunks):
        start_time = i * chunk_duration
        chunk_path = audio_path.parent / f"chunk_{i:03d}.mp3"

        cmd = [
            'ffmpeg', '-i', str(audio_path),
            '-ss', str(start_time),
            '-t', str(chunk_duration),
            '-acodec', 'mp3', '-ar', '16000', '-ac', '1', '-b:a', '64k',
            '-y', str(chunk_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg chunk failed: {result.stderr}")

        chunks.append(chunk_path)

    return chunks


def transcribe_chunk(audio_path: Path, client: OpenAI) -> str:
    """Transcribe a single audio chunk."""
    with open(audio_path, 'rb') as f:
        response = client.audio.transcriptions.create(
            model='whisper-1',
            file=f,
            response_format='text'
        )
    return response


def transcribe(audio_path: Path, progress_callback=None) -> tuple[str, float]:
    """Transcribe audio using OpenAI Whisper API. Returns (transcript, cost)."""
    client = OpenAI()

    # Get file size for cost estimation
    file_size = audio_path.stat().st_size

    # Split into chunks if needed (20MB max per chunk)
    chunks = split_audio(audio_path, max_size_mb=20)

    transcripts = []
    for i, chunk_path in enumerate(chunks):
        if progress_callback:
            progress_callback('transcribing', f'Transcribing chunk {i+1} of {len(chunks)}...', i + 1, len(chunks))

        transcript = transcribe_chunk(chunk_path, client)
        transcripts.append(transcript)

        # Clean up chunk file if it's not the original
        if chunk_path != audio_path:
            chunk_path.unlink()

    # Combine transcripts
    full_transcript = "\n\n".join(transcripts)

    # Cost: $0.006 per minute (estimate based on file size)
    duration_minutes = file_size / (16000 * 2 * 60)
    cost = duration_minutes * 0.006

    return full_transcript, cost


def generate_notes(transcript: str, duration_seconds: int) -> tuple[str, float]:
    """Generate notes using Claude. Returns (markdown_notes, cost)."""
    client = Anthropic()

    hours = int(duration_seconds // 3600)
    minutes = int((duration_seconds % 3600) // 60)
    duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

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

    # Cost calculation (Claude Sonnet pricing)
    input_cost = (response.usage.input_tokens / 1_000_000) * 3.00
    output_cost = (response.usage.output_tokens / 1_000_000) * 15.00
    cost = input_cost + output_cost

    return response.content[0].text, cost


def transcript_to_html(transcript: str, title: str, duration_seconds: int) -> str:
    """Convert raw transcript to readable HTML with styling."""
    # Split transcript into paragraphs (double newlines or very long sections)
    paragraphs = transcript.split('\n\n')

    # If only one paragraph, try to split on sentence boundaries for readability
    if len(paragraphs) <= 2:
        # Split long text into chunks of ~500 chars at sentence boundaries
        chunks = []
        current_chunk = ""
        sentences = re.split(r'(?<=[.!?])\s+', transcript)
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > 500:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence
        if current_chunk:
            chunks.append(current_chunk.strip())
        paragraphs = chunks

    html_paragraphs = [f'<p>{p.strip()}</p>' for p in paragraphs if p.strip()]
    html_body = '\n'.join(html_paragraphs)

    hours = int(duration_seconds // 3600)
    minutes = int((duration_seconds % 3600) // 60)
    duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Transcript</title>
    <style>
        :root {{
            --bg: #ffffff;
            --text: #1a1a1a;
            --accent: #2563eb;
            --muted: #666666;
            --border: #e5e7eb;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #1a1a1a;
                --text: #e5e7eb;
                --accent: #60a5fa;
                --muted: #9ca3af;
                --border: #374151;
            }}
        }}
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            max-width: 750px;
            margin: 0 auto;
            padding: 2rem;
            color: var(--text);
            background: var(--bg);
        }}
        header {{
            border-bottom: 2px solid var(--accent);
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }}
        h1 {{
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
        }}
        .meta {{
            color: var(--muted);
            font-size: 0.875rem;
        }}
        p {{
            margin: 1rem 0;
            text-align: justify;
        }}
        @media print {{
            body {{
                max-width: none;
                padding: 1rem;
            }}
        }}
    </style>
</head>
<body>
    <header>
        <h1>{title}</h1>
        <div class="meta">Full Transcript | Duration: {duration_str}</div>
    </header>
    <article>
{html_body}
    </article>
</body>
</html>"""


def markdown_to_html(markdown: str, title: str) -> str:
    """Convert markdown to self-contained HTML with styling."""
    html_body = markdown

    # Convert headers
    html_body = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html_body, flags=re.MULTILINE)
    html_body = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html_body, flags=re.MULTILINE)

    # Convert bold and italic
    html_body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_body)
    html_body = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html_body)

    # Convert bullet lists
    html_body = re.sub(r'^- (.+)$', r'<li>\1</li>', html_body, flags=re.MULTILINE)

    # Wrap consecutive <li> tags in <ul>
    html_body = re.sub(r'((?:<li>.*?</li>\n?)+)', r'<ul>\1</ul>', html_body)

    # Convert numbered lists
    html_body = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html_body, flags=re.MULTILINE)

    # Convert horizontal rules
    html_body = re.sub(r'^---+$', r'<hr>', html_body, flags=re.MULTILINE)

    # Convert paragraphs (double newlines)
    paragraphs = html_body.split('\n\n')
    processed = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<'):
            p = f'<p>{p}</p>'
        processed.append(p)
    html_body = '\n'.join(processed)

    # Replace single newlines within paragraphs with <br>
    html_body = re.sub(r'(?<!>)\n(?!<)', '<br>\n', html_body)

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
            --border: #e5e7eb;
        }}
        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg: #1a1a1a;
                --text: #e5e7eb;
                --accent: #60a5fa;
                --muted: #9ca3af;
                --border: #374151;
            }}
        }}
        * {{
            box-sizing: border-box;
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
        h1 {{
            border-bottom: 2px solid var(--accent);
            padding-bottom: 0.5rem;
            margin-top: 0;
        }}
        h2 {{
            color: var(--accent);
            margin-top: 2.5rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0.25rem;
        }}
        h3 {{
            color: var(--muted);
            margin-top: 1.5rem;
        }}
        ul, ol {{
            padding-left: 1.5rem;
        }}
        li {{
            margin: 0.5rem 0;
        }}
        hr {{
            border: none;
            border-top: 1px solid var(--border);
            margin: 2rem 0;
        }}
        strong {{
            color: var(--accent);
        }}
        @media print {{
            body {{
                max-width: none;
                padding: 1rem;
            }}
        }}
    </style>
</head>
<body>
{html_body}
</body>
</html>"""


def emit_progress(step: str, message: str, progress: int = 0, total: int = 0):
    """Emit a structured progress message for the frontend."""
    data = {'step': step, 'message': message}
    if total > 0:
        data['progress'] = progress
        data['total'] = total
    print(f"PROGRESS:{json.dumps(data)}", file=sys.stderr, flush=True)


def process_video(video_path: str, output_base: str) -> dict:
    """Main processing function."""
    video_path = Path(video_path).expanduser().resolve()
    output_base = Path(output_base).expanduser().resolve()

    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # Check for required environment variables
    if not os.environ.get('OPENAI_API_KEY'):
        raise EnvironmentError("OPENAI_API_KEY not set")
    if not os.environ.get('ANTHROPIC_API_KEY'):
        raise EnvironmentError("ANTHROPIC_API_KEY not set")

    # Create output directory
    output_base.mkdir(parents=True, exist_ok=True)

    # Check for duplicates
    emit_progress('checking', 'Checking for duplicates...')
    file_hash = get_file_hash(video_path)
    existing = check_already_processed(output_base, file_hash)
    if existing:
        return {
            'status': 'duplicate',
            'existing_folder': str(existing),
            'folder_name': existing.name,
            'message': f'Already processed: {existing.name}'
        }

    # Create output folder
    timestamp = datetime.now().strftime('%Y-%m-%d')
    # Clean filename for folder name
    clean_name = re.sub(r'[^\w\-]', '-', video_path.stem[:30])
    folder_name = f"{timestamp}-{clean_name}"
    output_folder = output_base / folder_name
    output_folder.mkdir(exist_ok=True)

    emit_progress('extracting', f'Extracting audio from {video_path.name}...')

    # Extract audio
    audio_path = output_folder / 'audio.mp3'
    duration = extract_audio(video_path, audio_path)
    duration_min = int(duration // 60)
    emit_progress('extracting', f'Audio extracted ({duration_min} minutes)')

    # Transcribe
    emit_progress('transcribing', 'Starting transcription with Whisper...')
    transcript, transcription_cost = transcribe(audio_path, emit_progress)
    (output_folder / 'transcript.txt').write_text(transcript)
    emit_progress('transcribing', f'Transcription complete ({len(transcript):,} characters)')

    # Generate summary notes
    emit_progress('summarizing', 'Generating summary notes with Claude...')
    notes_md, summarization_cost = generate_notes(transcript, int(duration))
    (output_folder / 'notes.md').write_text(notes_md)

    # Extract title from notes (first H1)
    title_match = re.search(r'^# (.+)$', notes_md, re.MULTILINE)
    title = title_match.group(1) if title_match else video_path.stem

    # Generate HTML transcript (viewable in browser)
    emit_progress('finalizing', 'Generating HTML transcript...')
    html = transcript_to_html(transcript, title, int(duration))
    (output_folder / 'transcript.html').write_text(html)

    # Clean up audio file (saves disk space)
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

    emit_progress('complete', f'Done! Cost: ${total_cost:.2f}')

    return {
        'status': 'success',
        'folder': str(output_folder),
        'folder_id': output_folder.name,
        'title': title,
        'cost': total_cost
    }


def reprocess_notes(folder_path: str) -> dict:
    """Reprocess existing notes folder - regenerate summary from existing transcript."""
    folder = Path(folder_path).expanduser().resolve()

    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder}")

    # Load existing transcript
    transcript_path = folder / 'transcript.txt'
    if not transcript_path.exists():
        raise FileNotFoundError("Transcript not found - cannot reprocess")

    emit_progress('loading', 'Loading existing transcript...')
    transcript = transcript_path.read_text(encoding='utf-8')

    # Load metadata for duration
    metadata_path = folder / 'metadata.json'
    metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}
    duration_seconds = metadata.get('duration_seconds', 0)

    # Regenerate summary
    emit_progress('summarizing', 'Regenerating summary with updated prompts...')
    notes, summary_cost = generate_notes(transcript, duration_seconds)

    # Save new summary
    notes_path = folder / 'notes.md'
    notes_path.write_text(notes, encoding='utf-8')

    # Extract title from notes (first H1)
    title_match = re.search(r'^# (.+)$', notes, re.MULTILINE)
    title = title_match.group(1) if title_match else folder.name

    # Update metadata
    metadata['title'] = title
    metadata['reprocessed_at'] = datetime.now().isoformat()
    metadata['summary_cost'] = summary_cost
    if 'cost' in metadata:
        # Keep original transcription cost, only update summary cost
        metadata['cost'] = metadata.get('transcription_cost', 0) + summary_cost
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')

    emit_progress('complete', f'Reprocessed! Cost: ${summary_cost:.2f}')

    return {
        'status': 'success',
        'folder': str(folder),
        'folder_id': folder.name,
        'title': title,
        'cost': summary_cost
    }


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Process a video file and generate class notes.')
    parser.add_argument('video_path', help='Path to the video file or folder to reprocess')
    parser.add_argument('output_dir', nargs='?', help='Directory to store output files (not needed for reprocess)')
    parser.add_argument('--folder', help='Optional folder name (not used currently)', default=None)
    parser.add_argument('--reprocess', action='store_true', help='Reprocess existing folder (regenerate summary from existing transcript)')

    args = parser.parse_args()

    try:
        if args.reprocess:
            # video_path is actually the folder path when reprocessing
            result = reprocess_notes(args.video_path)
        else:
            if not args.output_dir:
                raise ValueError("output_dir required when not reprocessing")
            result = process_video(args.video_path, args.output_dir)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'status': 'error', 'message': str(e)}))
        sys.exit(1)
