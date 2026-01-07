# Queue Visibility and Reprocess Feature Implementation Plan

**Created**: January 6, 2026
**Branch**: `feature/queue-visibility-and-reprocess`

## Issues Identified

### 1. Queue Panel Visibility

**Problem**: When uploading videos, the queue panel doesn't automatically show or stays hidden
**Root Cause**: The QueuePanel defaults to `isExpanded: true` but only renders when queueState has items. Need to ensure it auto-expands when new items are added.

### 2. Progress Bar Display

**Problem**: Progress bar not showing during processing
**Current State**:

- Python script sends progress via `PROGRESS:` messages with `progress` and `total` values
- QueuePanel has progress bar code (lines 259-269) that checks for `item.progress?.progress`
- Progress is sent during transcription chunking
  **Likely Issue**: Need to verify SSE events are properly updating the UI

### 3. Reprocess Feature (New)

**Requirement**: Allow reprocessing videos in library to regenerate summaries with new prompt changes (e.g., blog post generation) without redoing transcription/audio extraction

## Implementation Tasks

### Task 1: Fix Queue Panel Auto-Expansion

**File**: `components/mvp/QueuePanel.tsx`

**Changes**:

1. Add prop to control initial expansion state
2. Auto-expand when items are added
3. Keep expanded state when processing is active

**Code Changes**:

```typescript
export function QueuePanel({
  queueState,
  onRemoveItem,
  onRetryItem,
  onClearCompleted,
  onViewNotes,
}: QueuePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-expand when new items arrive or processing starts
  useEffect(() => {
    if (
      queueState?.items.some(
        (i) => i.status === "pending" || i.status === "processing",
      )
    ) {
      setIsExpanded(true);
    }
  }, [queueState?.items.length]);

  // rest of component...
}
```

### Task 2: Verify and Enhance Progress Display

**File**: `components/mvp/QueuePanel.tsx`

**Current Progress Bar Code** (lines 259-269):

```typescript
{item.status === "processing" &&
  item.progress?.progress !== undefined && (
    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
      <div
        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
        style={{
          width: `${item.progress.total ? (item.progress.progress / item.progress.total) * 100 : 0}%`,
        }}
      />
    </div>
  )}
```

**Verification Steps**:

1. Test with video upload to see if progress bar shows
2. Add console logging to see progress events
3. Ensure progress message displays alongside bar

**Potential Enhancement**:

```typescript
{item.status === "processing" && (
  <div className="mt-1">
    {item.progress?.message && (
      <div className="text-xs text-blue-600 mb-1">
        {item.progress.message}
      </div>
    )}
    {item.progress?.progress !== undefined && item.progress?.total && (
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${(item.progress.progress / item.progress.total) * 100}%`,
          }}
        />
      </div>
    )}
  </div>
)}
```

### Task 3: Implement Reprocess Feature

#### 3A: Add Reprocess Button to Library View

**File**: `components/mvp/LibraryView.tsx`

**Changes**:

1. Add "Regenerate Summary" button to each library item
2. Add confirmation dialog
3. Call reprocess API

#### 3B: Create Reprocess API Endpoint

**File**: `app/api/class-notes/[id]/reprocess/route.ts` (NEW)

**Implementation**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getQueueProcessor } from "@/lib/queue-processor";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    // Load existing metadata to get file info
    const notesDir = path.join(
      process.env.NOTES_BASE_DIR ||
        path.join(process.env.HOME!, "Dropbox/ClassNotes"),
      id,
    );

    const metadataPath = path.join(notesDir, "metadata.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));

    // Check that transcript exists (we won't redo this)
    const transcriptPath = path.join(notesDir, "transcript.txt");
    if (!(await fs.stat(transcriptPath).catch(() => null))) {
      return NextResponse.json(
        { error: "Transcript not found - cannot reprocess" },
        { status: 400 },
      );
    }

    // Queue reprocess job (special flag to skip transcription)
    const processor = getQueueProcessor();
    await processor.addReprocessJob(id, notesDir);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reprocess error:", error);
    return NextResponse.json(
      { error: "Failed to queue reprocess" },
      { status: 500 },
    );
  }
}
```

#### 3C: Add Reprocess Support to Python Script

**File**: `scripts/process_video.py`

**Changes**:

1. Add `--reprocess` flag
2. Skip audio extraction and transcription when reprocessing
3. Load existing transcript and regenerate summary

**Implementation**:

```python
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
    transcript = transcript_path.read_text()

    # Load metadata for title
    metadata_path = folder / 'metadata.json'
    metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    title = metadata.get('title', folder.name)

    # Regenerate summary
    emit_progress('summarizing', 'Regenerating summary with updated prompts...')
    notes, summary_cost = summarize(transcript, title)

    # Save new summary
    notes_path = folder / 'notes.md'
    notes_path.write_text(notes)

    # Update metadata
    metadata['reprocessed_at'] = datetime.now().isoformat()
    metadata['summary_cost'] = summary_cost
    metadata_path.write_text(json.dumps(metadata, indent=2))

    emit_progress('complete', f'Reprocessed! Cost: ${summary_cost:.2f}')

    return {
        'status': 'success',
        'folder': str(folder),
        'folder_id': folder.name,
        'title': title,
        'cost': summary_cost
    }

# Update main CLI
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Process a video file and generate class notes.')
    parser.add_argument('video_path', help='Path to the video file or folder to reprocess')
    parser.add_argument('output_dir', nargs='?', help='Directory to store output files')
    parser.add_argument('--folder', help='Optional folder name', default=None)
    parser.add_argument('--reprocess', action='store_true', help='Reprocess existing folder')

    args = parser.parse_args()

    try:
        if args.reprocess:
            # video_path is actually the folder path
            result = reprocess_notes(args.video_path)
        else:
            if not args.output_dir:
                raise ValueError("output_dir required when not reprocessing")
            result = process_video(args.video_path, args.output_dir)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'status': 'error', 'message': str(e)}))
        sys.exit(1)
```

#### 3D: Update Queue Processor for Reprocess

**File**: `lib/queue-processor.ts`

**Changes**:

1. Add `addReprocessJob` method
2. Handle reprocess items differently (use --reprocess flag)

**Implementation**:

```typescript
async addReprocessJob(folderId: string, folderPath: string): Promise<void> {
  const item: QueueItem = {
    id: randomUUID(),
    originalFileName: `Reprocess: ${folderId}`,
    filePath: folderPath, // Actually the folder path, not a video file
    fileSize: 0,
    status: "pending",
    addedAt: new Date().toISOString(),
    folder: folderId,
    isReprocess: true, // New flag
  };

  await addQueueItem(item);
  this.emit({ type: "state", state: await getQueueState() });
  this.processNext();
}

private async processItem(item: QueueItem): Promise<ProcessResult> {
  // ... existing code ...

  const args = item.isReprocess
    ? [scriptPath, item.filePath, "--reprocess"]
    : [scriptPath, item.filePath, outputDir];

  if (!item.isReprocess && item.folder) {
    args.push("--folder", item.folder);
  }

  const pythonProcess = spawn(pythonPath, args, {
    // ... rest of spawn config
  });

  // ... rest of method
}
```

## Testing Plan

### Test 1: Queue Visibility

1. Start fresh (clear queue)
2. Upload a video
3. Verify queue panel appears and is expanded
4. Verify panel stays expanded during processing

### Test 2: Progress Display

1. Upload a video
2. Watch for progress messages during:
   - Checking for duplicates
   - Extracting audio
   - Transcribing (especially with chunks)
   - Summarizing
   - Finalizing
3. Verify progress bar shows and updates during transcription

### Test 3: Reprocess Feature

1. Select a video from library that has been fully processed
2. Click "Regenerate Summary"
3. Verify it queues and processes without re-transcribing
4. Verify new summary reflects any prompt changes
5. Verify original transcript.txt is preserved

## Success Criteria

- [ ] Queue panel auto-expands when videos are uploaded
- [ ] Queue panel stays expanded during processing
- [ ] Progress bar displays and updates during transcription
- [ ] Progress messages show current step
- [ ] Reprocess button appears in library
- [ ] Reprocess successfully regenerates summary
- [ ] Reprocess skips transcription (uses existing transcript)
- [ ] Reprocess updates metadata with reprocess timestamp
- [ ] All 28 unit tests still pass

## Files to Modify

1. `components/mvp/QueuePanel.tsx` - Auto-expansion logic
2. `components/mvp/LibraryView.tsx` - Add reprocess button
3. `app/api/class-notes/[id]/reprocess/route.ts` - NEW: Reprocess API
4. `scripts/process_video.py` - Add reprocess function and --reprocess flag
5. `lib/queue-processor.ts` - Add reprocess job support
6. `lib/queue.ts` - Add `isReprocess` field to QueueItem type

## Rollback Plan

If issues arise:

1. Revert all changes: `git checkout main`
2. Delete feature branch: `git branch -D feature/queue-visibility-and-reprocess`
3. Issues are isolated to feature branch, main is safe
