#!/usr/bin/env python3
"""
Regenerate blog posts for existing processed videos.

Usage:
    python3 regenerate_blog.py [folder_name]

Examples:
    python3 regenerate_blog.py                           # All folders
    python3 regenerate_blog.py 2025-12-19-my-video       # Specific folder
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


def generate_blog(transcript: str, duration_seconds: int) -> tuple[str, float]:
    """Generate a first-person blog post from transcript. Returns (markdown_blog, cost)."""
    client = Anthropic()

    hours = int(duration_seconds // 3600)
    minutes = int((duration_seconds % 3600) // 60)
    duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

    response = client.messages.create(
        model='claude-sonnet-4-20250514',
        max_tokens=8192,
        messages=[{
            'role': 'user',
            'content': f"""You are writing a blog post AS IF YOU ARE THE TEACHER/SPEAKER from this class recording.

Write in FIRST PERSON perspective - use "I", "my", "we" as if you taught this class and are now sharing what you covered in a personal blog post.

IMPORTANT VOICE GUIDELINES:
- Write as if you're the instructor personally sharing your knowledge
- Use conversational, warm tone like you're talking to a friend
- Say "In today's class, I wanted to explore..." NOT "This class covers..."
- Say "What I find fascinating is..." NOT "The instructor explains..."
- Include personal touches like "One thing I always tell my students..."
- Make it feel like a thoughtful blog post, not a summary

TRANSCRIPT ({duration_str}):
{transcript}

---

Create a well-structured blog post (1500-2500 words) with:

# [Engaging Blog Title - Not Just the Topic Name]

## Introduction
Hook the reader. Share why this topic matters to you personally.

## [Major Topic 1 - Use Descriptive Headings]
Cover the first major area with depth. Include examples and stories I shared.

## [Major Topic 2]
Continue with other key areas...

## [Additional sections as needed based on content]

## Key Takeaways
Wrap up with actionable insights readers can apply.

---

Remember: You ARE the teacher. Write with authority and personal experience.
Format as clean, readable Markdown with proper spacing between sections."""
        }]
    )

    # Cost calculation (Claude Sonnet pricing)
    input_cost = (response.usage.input_tokens / 1_000_000) * 3.00
    output_cost = (response.usage.output_tokens / 1_000_000) * 15.00
    cost = input_cost + output_cost

    return response.content[0].text, cost


def process_folder(folder: Path) -> dict:
    """Generate blog for a single folder."""
    transcript_path = folder / 'transcript.txt'
    metadata_path = folder / 'metadata.json'
    blog_path = folder / 'blog.md'

    if not transcript_path.exists():
        return {'status': 'skip', 'reason': 'No transcript.txt'}

    if not metadata_path.exists():
        return {'status': 'skip', 'reason': 'No metadata.json'}

    if blog_path.exists():
        return {'status': 'skip', 'reason': 'blog.md already exists'}

    # Read transcript and metadata
    transcript = transcript_path.read_text()
    metadata = json.loads(metadata_path.read_text())
    duration = metadata.get('duration_seconds', 0)

    print(f"  Generating blog for: {metadata.get('title', folder.name)}")

    # Generate blog
    blog_md, cost = generate_blog(transcript, duration)
    blog_path.write_text(blog_md)

    # Update metadata with blog cost
    if 'costs' not in metadata:
        metadata['costs'] = {}
    metadata['costs']['blog'] = round(cost, 4)
    metadata['costs']['total'] = round(
        metadata['costs'].get('transcription', 0) +
        metadata['costs'].get('summarization', 0) +
        cost, 4
    )
    metadata_path.write_text(json.dumps(metadata, indent=2))

    return {'status': 'success', 'cost': cost}


def main():
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    output_dir = get_output_dir()
    if not output_dir.exists():
        print(f"Error: Output directory not found: {output_dir}", file=sys.stderr)
        sys.exit(1)

    # Determine which folders to process
    if len(sys.argv) > 1:
        # Specific folder
        folder_name = sys.argv[1]
        folders = [output_dir / folder_name]
        if not folders[0].exists():
            print(f"Error: Folder not found: {folders[0]}", file=sys.stderr)
            sys.exit(1)
    else:
        # All folders
        folders = sorted([f for f in output_dir.iterdir() if f.is_dir()])

    print(f"Processing {len(folders)} folder(s) in {output_dir}\n")

    total_cost = 0
    processed = 0
    skipped = 0

    for folder in folders:
        print(f"[{folder.name}]")
        result = process_folder(folder)

        if result['status'] == 'success':
            print(f"  ✓ Blog generated (${result['cost']:.4f})")
            total_cost += result['cost']
            processed += 1
        else:
            print(f"  - Skipped: {result['reason']}")
            skipped += 1
        print()

    print(f"Done! Processed: {processed}, Skipped: {skipped}, Total cost: ${total_cost:.4f}")


if __name__ == '__main__':
    main()
