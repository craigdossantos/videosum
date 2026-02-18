# VideoSum Product Improvements - Technical Plan

**Date:** 2026-02-17
**Status:** Planning
**PRD:** `~/.claude/plans/typed-enchanting-treasure.md`

## Overview

Transform VideoSum from an upload-first app into a library-first experience. The main page becomes the video library with a compact upload bar at top. Key additions: delete videos (OS trash via Electron IPC), sort/filter, filename display, drag-to-reorder in folders, branding rename to "Video Summarizer", and step-level progress in the queue panel.

The app is a single-user Electron desktop app wrapping a Next.js server. All data lives on the local filesystem (metadata.json per video folder, folders.json for organization). There is no database — the library API reads the notes directory and returns video metadata.

## Architecture

### Current State

```
app/demo/page.tsx (ViewState: "idle" | "processing" | "viewing" | "library" | "folder")
  ├── "idle"       → UploadCard (full-size, front and center)
  ├── "processing"  → ProcessingView (blocks interaction)
  ├── "viewing"     → NotesViewer
  ├── "library"     → LibraryView (secondary, reached via button)
  └── "folder"      → FolderView
```

### Target State

```
app/demo/page.tsx (ViewState: "library" | "folder" | "viewing")
  └── Always renders library layout:
      ├── CompactUploadBar (top, when videos exist)
      ├── EmptyState card (when 0 completed videos)
      ├── LibraryView (default content — sort/filter/search, delete, filename)
      ├── FolderView (replaces content — drag-to-reorder, delete)
      └── NotesViewer (replaces content — delete)
  QueuePanel stays as fixed bottom bar (independent of view state)
```

### Delete Architecture (Electron IPC)

```
Renderer (React)                 Main Process (electron/main.js)
  │                                │
  │ window.electronAPI.trashItem() │
  │ ─────────────────────────────► │ ipcMain.handle('trash-item')
  │                                │   → shell.trashItem(fullPath)
  │ ◄───────────────────────────── │
  │ { success: true }              │
  │                                │
  │ POST /api/class-notes/[id]     │
  │   (DELETE method)              │
  │   → removes ID from folders.json
  │   → confirms folder gone from disk
```

When running in dev mode (no Electron), the delete button checks `window.electronAPI` existence. If unavailable, it falls back to calling the DELETE API route which uses `fs.rm()` for permanent deletion — acceptable for dev/testing.

### Key Design Decisions

1. **View state simplification.** Remove `"idle"` and `"processing"` from `ViewState`. The library IS the idle state. Processing is tracked by QueuePanel independently. This means `handleFilesSelect` no longer sets `viewState` to `"processing"` — it adds to the queue and the user stays on the library.

2. **Upload flow change.** Currently, `handleFilesSelect` in `page.tsx` does direct SSE processing and shows a ProcessingView. After this work, file selection goes through the existing queue system (`POST /api/queue`). The inline SSE processing code and `ProcessingView` component are removed from `page.tsx`. All processing happens via the queue.

3. **Client-side sort/filter.** The library API already returns all videos in memory. Sort and filter happen in `LibraryView` state — no new API endpoints needed.

4. **`@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder.** Lightweight, well-maintained. Only needed in `FolderView`. Persist via existing `reorderVideosInFolder()` in `lib/folders.ts` (already implemented) and the existing `PUT /api/folders/[id]` reorder endpoint (needs creation — currently only GET exists for individual folders).

5. **Electron preload script.** Create `electron/preload.js` exposing `window.electronAPI.trashItem(path)`. Update `electron/main.js` to register the preload script and handle the `trash-item` IPC channel. The renderer calls `window.electronAPI?.trashItem()` with optional chaining — graceful no-op when Electron is not present.

6. **Branding rename scope.** Only user-facing UI strings change. API route paths (`/api/class-notes/`) stay unchanged. The `CLASS_NOTES_DIR` env var stays unchanged. Header text, page titles, empty states, and the Electron menu reference are updated.

---

## Section 1: Branding and Filename Display

Quick wins that improve identity and usability without changing component architecture.

#### 1.1 Rename branding to "Video Summarizer"

**Depends on:** none
**Files:** `app/demo/page.tsx`, `components/mvp/NotesViewer.tsx`, `electron/main.js`, `app/layout.tsx`

Find and replace all user-facing occurrences of "Class Notes Generator", "Class Notes Processor", "VideoSum" (subtitle), and "class" terminology in UI strings. The header in `page.tsx` currently shows "VideoSum" with subtitle "Class Notes Processor" — change subtitle to "Video Summarizer". The `NotesViewer` chat header says "Ask about this class" — change to "Ask about this video". The Electron menu Help item says "Open Output Folder" referencing "ClassNotes" — update label. The `page.tsx` idle view heading says "Class Notes Generator" — this view is being removed in 1.4, but update the heading text for intermediate commits.

Do NOT rename: API route paths, env vars, internal variable names, folder paths, the "VideoSum" brand name itself (just the subtitle).

Satisfies R3.

**Test scenarios:** (`__tests__/components/branding.test.tsx`)

- Render `page.tsx` header → subtitle text contains "Video Summarizer", not "Class Notes"
- Render `NotesViewer` chat header → text says "Ask about this video", not "class"
- Search all `.tsx` files for "class notes" (case-insensitive) → no matches in user-visible strings (template literals, JSX text)

**Verify:** `npm run typecheck && npm run lint` pass. Grep for "class notes" in tsx files returns 0 user-facing hits.

#### 1.2 Show original filename in video blurbs

**Depends on:** none
**Files:** `components/mvp/LibraryView.tsx`, `components/mvp/FolderView.tsx`, `__tests__/components/LibraryView.test.tsx`

Each video blurb currently shows title, duration, and date. Add a secondary line showing `path.basename(source_file)` below the title. The `ClassRecord` interface already has `source_file: string` — extract the basename client-side using `source_file.split('/').pop() || source_file`. Render as `<p className="text-xs text-gray-400 truncate">{basename}</p>` below the title in both `LibraryView` (uncategorized video rows) and `FolderView` (video cards). If `source_file` is empty/undefined (edge case with reprocessed items), fall back to showing nothing.

Follow the existing pattern of how duration/date are rendered as secondary metadata in `LibraryView` video rows.

Satisfies R4.

**Test scenarios:** (`__tests__/components/LibraryView.test.tsx`)

- Video with `source_file: "/path/to/lecture.mp4"` → renders "lecture.mp4" in the blurb
- Video with `source_file: "simple.mp4"` (no path) → renders "simple.mp4"
- Video with empty `source_file: ""` → no filename line rendered
- Filename display does not interfere with click-to-select behavior

**Verify:** `npm run test -- LibraryView` passes. Visual check in dev: each video row shows filename below title.

---

## Section 2: Delete Videos (Electron IPC + OS Trash)

The critical missing feature. Three parts: Electron IPC infrastructure, API route for folder cleanup, and UI delete buttons.

#### 2.1 Set up Electron IPC infrastructure for trash

**Depends on:** none
**Files:** `electron/preload.js` (new), `electron/main.js`

Create `electron/preload.js` that uses `contextBridge.exposeInMainWorld` to expose `window.electronAPI.trashItem(absolutePath: string): Promise<{success: boolean, error?: string}>`. In `electron/main.js`, add `ipcMain.handle('trash-item', ...)` that calls `shell.trashItem(path)` and returns success/failure. Update the `BrowserWindow` config to include `preload: path.join(__dirname, 'preload.js')` in `webPreferences`.

`shell.trashItem()` is async and returns a Promise. Wrap it in try/catch — if the path doesn't exist, it throws. Handle that gracefully (return success since the file is already gone).

No test file for this subtask — Electron IPC is verified via manual testing in `npm run electron:dev`.

**Test scenarios:** (manual)

- In Electron, `window.electronAPI` is defined
- `window.electronAPI.trashItem('/path/to/folder')` moves folder to OS trash
- Trashing a non-existent path returns `{success: true}` (idempotent)
- In `npm run dev` (no Electron), `window.electronAPI` is undefined

**Verify:** `npm run electron:dev` → open DevTools → `window.electronAPI` exists. Create a test folder, call `trashItem()`, confirm it appears in macOS Trash.

#### 2.2 Add DELETE handler to class-notes API route

**Depends on:** none
**Files:** `app/api/class-notes/[id]/route.ts`, `lib/folders.ts`, `__tests__/api/class-notes-delete.test.ts` (new)

Add a `DELETE` handler to the existing `[id]/route.ts`. Steps: (1) resolve the full path to the video folder using `getNotesDirectory()` + decoded ID, (2) verify the folder exists (404 if not), (3) call `removeVideoFromAllFolders(videoId)` — a new function in `lib/folders.ts` that iterates all folders and removes the ID from any `videoIds` arrays, (4) attempt to delete the folder from disk using `fs.rm(path, { recursive: true, force: true })` — this is the fallback for non-Electron environments, (5) return `{ success: true }`.

The new `removeVideoFromAllFolders` function in `lib/folders.ts`: load `getFoldersData()`, filter the videoId out of every folder's `videoIds` array, save. Follow the pattern of existing `removeVideoFromFolder()` but iterate all folders.

Satisfies R2 (folder cleanup part).

**Test scenarios:** (`__tests__/api/class-notes-delete.test.ts`)

- DELETE with valid ID → removes folder from disk, returns `{ success: true }`
- DELETE with valid ID that's in 2 folders → ID removed from both folders in folders.json
- DELETE with non-existent ID → returns 404
- DELETE with ID not in any folder → still succeeds (just deletes folder from disk)
- `removeVideoFromAllFolders("video-1")` with video in folders A and B → video removed from both, other videos untouched

**Verify:** `npm run test -- class-notes-delete` passes.

#### 2.3 Add delete button and confirmation to LibraryView

**Depends on:** 2.1, 2.2
**Files:** `components/mvp/LibraryView.tsx`, `__tests__/components/LibraryView.test.tsx`

Add a trash icon button to each video row in `LibraryView` (next to the existing reprocess button). On click, show a confirmation dialog (`window.confirm()` — matches existing reprocess pattern). On confirm: (1) if `window.electronAPI?.trashItem` exists, call it with the full folder path, (2) regardless, call `DELETE /api/class-notes/${videoId}` to clean up folders.json and (for non-Electron) delete from disk, (3) remove the video from local state (`setVideos`). The folder path for the trash call is constructed from the video ID — it's the folder name under the notes base directory. The base directory comes from a new API call or can be passed as a prop. Simpler approach: let the DELETE API route handle the actual deletion; the Electron trash call is an optimization that runs first when available. If the Electron trash call succeeds, the DELETE route will find the folder already gone and just clean up folders.json.

Add the delete button using the existing `TrashIcon` pattern from `QueuePanel.tsx` (inline SVG).

Satisfies R2, R9 (LibraryView part).

**Test scenarios:** (`__tests__/components/LibraryView.test.tsx`)

- Delete button visible for each uncategorized video
- Click delete → confirmation dialog shown
- Confirm delete → `DELETE /api/class-notes/${id}` called
- Cancel delete → no API call made
- After successful delete → video removed from displayed list
- Delete error → error message shown, video remains in list

**Verify:** `npm run test -- LibraryView` passes. Manual: delete a video, check macOS Trash.

#### 2.4 Add delete to FolderView and NotesViewer

**Depends on:** 2.2, 2.3
**Files:** `components/mvp/FolderView.tsx`, `components/mvp/NotesViewer.tsx`

Add the same delete pattern (trash icon + confirm + API call) to FolderView video cards and NotesViewer header. In FolderView, the delete button replaces the existing "remove from folder" X button — or sits alongside it (delete = permanent, X = just remove from folder). In NotesViewer, add a delete button to the header action bar (next to download buttons). After successful delete in NotesViewer, call `onBack()` to return to library.

`NotesViewer` currently doesn't have the video ID in a format suitable for the DELETE call — it already receives `id` as a prop which is the folder name, so `DELETE /api/class-notes/${encodeURIComponent(id)}` works directly.

Satisfies R9.

**Test scenarios:** (manual — these components are complex to unit test with current setup)

- FolderView: delete button visible per video, confirmation works, video removed after delete
- NotesViewer: delete button in header, confirmation works, navigates back after delete
- In both views: Electron trash is attempted first when available

**Verify:** Manual testing in `npm run dev` and `npm run electron:dev`.

---

## Section 3: Library-First UX Redesign

The largest change — restructuring page.tsx to make the library the default view.

#### 3.1 Create CompactUploadBar component

**Depends on:** none
**Files:** `components/mvp/CompactUploadBar.tsx` (new), `__tests__/components/CompactUploadBar.test.tsx` (new)

Create a slim horizontal upload bar component. Layout: a single row with a file icon, "Drop videos here or" text, a "Choose files" button, and accepted formats hint. Height ~48px normally. When a file is dragged over, the bar expands to ~80px with a blue-highlighted drop zone (same drag handling pattern as existing `UploadCard`). Props: `onFilesSelect: (files: File[]) => void`, `disabled?: boolean`.

Follow the existing `UploadCard` patterns for drag-and-drop handling, file type filtering (`file.type.startsWith("video/")`), and the hidden file input approach. This is essentially a compact version of `UploadCard`.

**Test scenarios:** (`__tests__/components/CompactUploadBar.test.tsx`)

- Renders with "Choose files" button and format hint
- Clicking "Choose files" triggers file input click
- Selecting files calls `onFilesSelect` with File array
- Drag over → visual expansion (CSS class change)
- Drop non-video files → `onFilesSelect` not called
- `disabled={true}` → button disabled, drag ignored

**Verify:** `npm run test -- CompactUploadBar` passes.

#### 3.2 Restructure page.tsx to library-first layout

**Depends on:** 3.1, 1.1
**Files:** `app/demo/page.tsx`

Major refactor of the main page:

1. Change `ViewState` from `"idle" | "processing" | "viewing" | "library" | "folder"` to `"library" | "folder" | "viewing"`. Default to `"library"`.

2. Remove `ProcessingView` component and all inline SSE processing code from `handleFilesSelect`. Replace with: create FormData, POST to `/api/queue` (the existing queue endpoint), done. The queue panel handles progress display. This means removing the SSE reader, `ProgressState`, the `STEPS` array, and `getStepIndex` from this file — the queue panel already has its own progress display.

3. Layout structure: always render the header, always render a `CompactUploadBar` (when library has videos) OR the full `UploadCard` empty state (when 0 videos). Below that, render the current view (`LibraryView`, `FolderView`, or `NotesViewer`).

4. Remove the `handleBackToIdle` function — `onBack` from sub-views now goes to `setViewState("library")`. The header click also goes to library, not idle.

5. Update `handleFilesSelect` to POST files to the queue API. Follow the pattern in the existing queue route (`POST /api/queue` with FormData containing multiple files). After posting, the user stays on the library view. The queue panel auto-expands (already implemented in `QueuePanel`).

6. The `libraryCount` state still needed for the empty state check. Fetch on mount (existing pattern).

Satisfies R1, R5.

**Test scenarios:** (manual — page.tsx is a page component with complex state)

- App loads → library view shown (not upload card)
- 0 videos → full-size upload card shown within library layout
- Videos exist → compact upload bar at top, library below
- Upload files → added to queue, user stays on library
- Navigate to notes → back button returns to library
- Navigate to folder → back button returns to library

**Verify:** `npm run dev` → visual check. `npm run typecheck` passes (no references to removed types).

#### 3.3 Wire queue-based upload into library-first flow

**Depends on:** 3.2
**Files:** `app/demo/page.tsx`, `hooks/useQueueEvents.ts`

Connect the restructured page to the existing queue system. The page needs: (1) `useQueueEvents()` hook for real-time queue state, (2) `QueuePanel` rendered at the bottom (already exists, just needs to be added to the page layout since it was previously missing or conditionally rendered), (3) the upload bar's `onFilesSelect` handler POSTs to `/api/queue`.

Check if `useQueueEvents` is already used in `page.tsx` — from the code exploration, it's NOT currently imported. The current flow is inline SSE. Add the import and hook call. Render `QueuePanel` with the queue state and action handlers (`onRemoveItem`, `onRetryItem`, `onClearCompleted` → existing queue API calls).

When a queue item completes and the user is on the library view, the library should refresh. Add a `useEffect` that watches for completed items in `queueState` and refetches the library data. The simplest approach: pass a `refreshKey` counter to `LibraryView` that increments when a queue item completes.

Satisfies R5 (non-blocking processing).

**Test scenarios:** (manual)

- Upload files → appear in queue panel at bottom
- Queue processes → progress shown in queue panel
- Library view stays interactive during processing
- Completed item → library auto-refreshes, new video appears
- Can view notes for existing videos while processing continues

**Verify:** Manual test: upload a video, browse library while it processes, confirm new video appears when done.

---

## Section 4: Sort and Filter

#### 4.1 Add sort and filter controls to LibraryView

**Depends on:** 1.2
**Files:** `components/mvp/LibraryView.tsx`, `__tests__/components/LibraryView.test.tsx`

Add a toolbar below the header with: (1) a search input (text filter), (2) a sort dropdown. All client-side — videos are already loaded in state.

**Search:** Filter `videos` array by case-insensitive partial match on `title` and `source_file` basename. Use a `searchQuery` state variable with a debounce (250ms) or just filter on every keystroke (the list is small enough). Apply filter to both uncategorized videos and the total count display.

**Sort:** Options: "Newest first" (default, `processed_at` desc), "Oldest first" (`processed_at` asc), "Title A-Z" (`title` localeCompare), "Title Z-A" (`title` localeCompare reversed), "Longest first" (`duration_seconds` desc). Use a `sortOption` state variable. Apply sort after filter.

Render the toolbar as a flex row: search input (flex-1), sort dropdown (fixed width). Use a native `<select>` for the sort — simple, accessible, no dependency needed. Position below the header, above the folders section.

Satisfies R6.

**Test scenarios:** (`__tests__/components/LibraryView.test.tsx`)

- Default sort → videos ordered by `processed_at` descending (newest first)
- Search "lecture" → only videos with "lecture" in title or filename shown
- Search with no matches → "No videos match" message
- Sort by "Title A-Z" → alphabetical order
- Sort + search combined → filter applied first, then sort
- Clear search → all videos shown again
- Search is case-insensitive ("LECTURE" matches "lecture.mp4")

**Verify:** `npm run test -- LibraryView` passes. Visual check in dev.

---

## Section 5: Drag-to-Reorder in Folders

#### 5.1 Install @dnd-kit and add drag-to-reorder to FolderView

**Depends on:** none
**Files:** `package.json`, `components/mvp/FolderView.tsx`

Install `@dnd-kit/core` and `@dnd-kit/sortable` as dependencies. In `FolderView`, wrap the video list with `DndContext` and `SortableContext`. Each video card becomes a `useSortable` item. On drag end (`onDragEnd`), compute the new order from `arrayMove`, update local state, and persist by calling `PUT /api/folders/${folderId}/reorder` with the new `videoIds` array.

The existing `reorderVideosInFolder()` in `lib/folders.ts` already handles the persistence logic and validates that all IDs are present. The API endpoint needs to be created (5.2).

Use `verticalListSortingStrategy` from `@dnd-kit/sortable`. Add a drag handle (grip icon) to the left of each video card — the existing order number circle can become the drag handle. Use `CSS.Transform.toString(transform)` for the drag visual.

Satisfies R7.

**Test scenarios:** (manual — dnd-kit testing requires complex pointer event simulation)

- Drag handle visible on each video card in folder view
- Dragging a video reorders the list visually
- Dropping saves the new order (verify via page refresh)
- Dragging outside the list cancels the reorder

**Verify:** Manual: open a folder with 3+ videos, drag to reorder, refresh, confirm order persisted.

#### 5.2 Create reorder API endpoint

**Depends on:** none
**Files:** `app/api/folders/[id]/reorder/route.ts` (new), `__tests__/api/folder-reorder.test.ts` (new)

Create a `PUT` endpoint that accepts `{ videoIds: string[] }` and calls `reorderVideosInFolder(folderId, videoIds)` from `lib/folders.ts`. Validate with Zod: `videoIds` must be a non-empty string array. Return 400 if validation fails, 404 if folder not found, 200 with `{ success: true }` on success.

Follow the existing folder API patterns in `app/api/folders/[id]/route.ts` for param handling (Next.js 15 async params pattern) and error responses.

**Test scenarios:** (`__tests__/api/folder-reorder.test.ts`)

- Valid reorder request → returns 200, folders.json updated with new order
- Empty videoIds array → returns 400
- Missing videoIds → returns 400
- Non-existent folder → returns 404
- videoIds with different IDs than folder contains → returns 400 (reorderVideosInFolder validates)
- videoIds with subset of folder's IDs → returns 400

**Verify:** `npm run test -- folder-reorder` passes.

---

## Section 6: Queue Progress Enhancement

#### 6.1 Add step-level progress display to QueuePanel

**Depends on:** none
**Files:** `components/mvp/QueuePanel.tsx`, `__tests__/components/QueuePanel.test.tsx`

Enhance the progress display in `QueueItemRow` for processing items. Currently shows `item.progress?.message` and a progress bar for chunk counts. Add step-level context: map the `item.progress.step` value to a human-readable step name and show "Step N/6: StepName" format. The step names are: checking, extracting, transcribing, summarizing, blogging, finalizing (same as `STEPS` array currently in `page.tsx` — extract to a shared constant in `lib/constants.ts` or define inline in QueuePanel).

Display format: `"Transcribing — step 3/6"` below the filename, replacing the current bare `item.progress.message`. Keep the existing chunk progress bar for the transcribing step.

Satisfies R8.

**Test scenarios:** (`__tests__/components/QueuePanel.test.tsx`)

- Processing item with `progress.step: "transcribing"` → shows "Transcribing — step 3/6"
- Processing item with `progress.step: "summarizing"` → shows "Generating Notes — step 4/6"
- Processing item with no progress → shows "Processing..." fallback
- Completed items → no step display, just status

**Verify:** `npm run test -- QueuePanel` passes.

#### 6.2 Add new video highlight in library

**Depends on:** 3.3
**Files:** `components/mvp/LibraryView.tsx`

When a video finishes processing and appears in the library, briefly highlight it. Track "new" video IDs by comparing the video list before and after a refresh. When new IDs are detected, add them to a `newVideoIds` Set state. Render a colored left border (`border-l-4 border-blue-500`) and a small "New" badge on those rows. Remove the highlight after 5 seconds using `setTimeout` that clears IDs from the set.

Satisfies R10.

**Test scenarios:** (manual)

- Process a video → appears in library with blue border and "New" badge
- After 5 seconds → highlight fades/removes
- Navigating away and back → no highlight (only on initial appearance)

**Verify:** Manual: upload a video, watch for highlight when it completes.

---

## Testing Strategy

- **Unit tests:** Vitest with React Testing Library. Follow existing patterns in `__tests__/components/LibraryView.test.tsx` (mock fetch, render component, assert DOM). New test files for: `CompactUploadBar`, `class-notes-delete`, `folder-reorder`. Extend existing `LibraryView.test.tsx` and `QueuePanel.test.tsx`.
- **Integration tests:** The API route tests (`class-notes-delete`, `folder-reorder`) test the full route handler with mocked filesystem.
- **Manual verification:** Each section has specific manual checks. Critical path: upload video → appears in queue → processes → appears in library with highlight → sort/filter works → delete sends to trash → drag-reorder in folder persists.

## Risks and Mitigations

| Risk                                                     | Mitigation                                                                                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Electron preload script not loading in packaged app      | Test with `npm run electron:build` before merge. Preload path must use `__dirname` which resolves differently in packaged vs dev mode — use `app.isPackaged` conditional.                                                 |
| `@dnd-kit` bundle size impact                            | `@dnd-kit/core` is ~12KB gzipped, `@dnd-kit/sortable` ~4KB — acceptable for desktop app. Tree-shaking handles unused exports.                                                                                             |
| Queue-based upload is a behavior change                  | Users currently see inline progress. After this change, progress moves to the bottom QueuePanel. The panel auto-expands (already implemented), so it should be discoverable.                                              |
| Removing ProcessingView breaks the upload-and-wait flow  | Users who upload a single file and want to immediately see results will now need to click the completed item in the queue or notice the library refresh. Consider keeping a toast/notification when processing completes. |
| `shell.trashItem()` path resolution in packaged Electron | The notes directory path must be absolute. `getNotesDirectory()` already returns an absolute path. Verify in packaged build.                                                                                              |

## Open Questions

None — all decisions resolved during PRD brainstorming and tech planning Q&A.

## Dependency Summary

| New Dependency      | Purpose                 | Size          |
| ------------------- | ----------------------- | ------------- |
| `@dnd-kit/core`     | Drag-and-drop framework | ~12KB gzipped |
| `@dnd-kit/sortable` | Sortable list preset    | ~4KB gzipped  |
