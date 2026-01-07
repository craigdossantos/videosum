#!/usr/bin/env python3
"""
Regenerate notes for existing processed videos with improved section handling.

Only includes sections when there's relevant content. Marks sections as
"Not applicable" when the transcript doesn't contain that type of content.

Usage:
    python3 regenerate_notes.py [folder_name]

Examples:
    python3 regenerate_notes.py                           # All folders
    python3 regenerate_notes.py 2025-12-19-my-video       # Specific folder
"""

import sys
import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env.local'
if not env_path.exists():
    env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

from anthropic import Anthropic


def get_output_dir() -> Path:
    """Get the ClassNotes output directory."""
    config_dir = os.environ.get('CLASS_NOTES_DIR', '~/ClassNotes')
    return Path(config_dir).expanduser().resolve()


def generate_notes(transcript: str, duration_seconds: int) -> tuple[str, float]:
    """Generate notes with conditional sections. Returns (markdown_notes, cost)."""
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

Create detailed notes with the following sections. IMPORTANT: Only include a section if there is CLEAR, RELEVANT content for it in the transcript. If a section doesn't apply, write "Not applicable for this recording." under that heading.

# [Infer an appropriate title from the content]

## Overview
Brief summary of what this class covered and key takeaways.

## Core Concepts
Each major concept explained clearly. Use ### for each concept.
- Only include if the transcript teaches specific concepts, theories, or frameworks
- If this is a guided practice/meditation without conceptual teaching, mark as "Not applicable for this recording."

## Stories & Examples
Any illustrative stories, examples, or case studies mentioned.
For each, include the story and the lesson/point it illustrates.
- Only include if the speaker shares specific stories, anecdotes, or detailed examples
- If none are present, mark as "Not applicable for this recording."

## Exercises & Practices
Step-by-step instructions for any exercises, practices, or techniques taught.
Include purpose, duration if mentioned, and clear instructions.
- Only include if specific exercises, meditations, or practices are guided/taught
- If this is purely lecture/discussion without hands-on practice, mark as "Not applicable for this recording."

## Key Insights
Bullet points of the most important takeaways.

---

Be detailed and capture the essence of the class. Do NOT include timestamps or speaker labels.
Do NOT fabricate content - only include what is actually in the transcript.
Format as clean Markdown."""
        }]
    )

    # Cost calculation (Claude Sonnet pricing)
    input_cost = (response.usage.input_tokens / 1_000_000) * 3.00
    output_cost = (response.usage.output_tokens / 1_000_000) * 15.00
    cost = input_cost + output_cost

    return response.content[0].text, cost


def process_folder(folder: Path, force: bool = False) -> dict:
    """Regenerate notes for a single folder."""
    transcript_path = folder / 'transcript.txt'
    metadata_path = folder / 'metadata.json'
    notes_path = folder / 'notes.md'
    backup_path = folder / 'notes.md.bak'

    if not transcript_path.exists():
        return {'status': 'skip', 'reason': 'No transcript.txt'}

    if not metadata_path.exists():
        return {'status': 'skip', 'reason': 'No metadata.json'}

    if notes_path.exists() and not force:
        return {'status': 'skip', 'reason': 'notes.md already exists (use --force to overwrite)'}

    # Read transcript and metadata
    transcript = transcript_path.read_text()
    metadata = json.loads(metadata_path.read_text())
    duration = metadata.get('duration_seconds', 0)

    print(f"  Generating notes for: {metadata.get('title', folder.name)}")

    # Backup existing notes
    if notes_path.exists():
        backup_path.write_text(notes_path.read_text())
        print(f"  (Backed up existing notes to notes.md.bak)")

    # Generate notes
    notes_md, cost = generate_notes(transcript, duration)
    notes_path.write_text(notes_md)

    # Update metadata with new summarization cost
    if 'costs' not in metadata:
        metadata['costs'] = {}
    old_cost = metadata['costs'].get('summarization', 0)
    metadata['costs']['summarization'] = round(cost, 4)
    metadata['costs']['total'] = round(
        metadata['costs'].get('transcription', 0) +
        cost +
        metadata['costs'].get('blog', 0), 4
    )
    metadata_path.write_text(json.dumps(metadata, indent=2))

    return {'status': 'success', 'cost': cost, 'old_cost': old_cost}


def main():
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    output_dir = get_output_dir()
    if not output_dir.exists():
        print(f"Error: Output directory not found: {output_dir}", file=sys.stderr)
        sys.exit(1)

    # Parse arguments
    force = '--force' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]

    # Determine which folders to process
    if args:
        # Specific folder
        folder_name = args[0]
        folders = [output_dir / folder_name]
        if not folders[0].exists():
            print(f"Error: Folder not found: {folders[0]}", file=sys.stderr)
            sys.exit(1)
    else:
        # All folders
        folders = sorted([f for f in output_dir.iterdir() if f.is_dir()])

    print(f"Processing {len(folders)} folder(s) in {output_dir}")
    if force:
        print("(--force mode: will overwrite existing notes.md files)\n")
    else:
        print("(Use --force to overwrite existing notes.md files)\n")

    total_cost = 0
    processed = 0
    skipped = 0

    for folder in folders:
        print(f"[{folder.name}]")
        result = process_folder(folder, force=force)

        if result['status'] == 'success':
            print(f"  ✓ Notes generated (${result['cost']:.4f})")
            total_cost += result['cost']
            processed += 1
        else:
            print(f"  - Skipped: {result['reason']}")
            skipped += 1
        print()

    print(f"Done! Processed: {processed}, Skipped: {skipped}, Total cost: ${total_cost:.4f}")


if __name__ == '__main__':
    main()
