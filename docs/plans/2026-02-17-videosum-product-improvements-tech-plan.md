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
  │ DELETE /api/class-notes/[id]   │
  │   → removes ID from all folders in folders.json
  │   → attempts fs.rm() (no-op if already trashed)
```

When running in dev mode (no Electron), `window.electronAPI` is undefined. The delete button skips the IPC trash call and only calls the DELETE API route, which uses `fs.rm()` for permanent deletion — acceptable for dev/testing. In Electron, the delete button calls `trashItem()` first (moves to OS trash), then calls the DELETE route to clean up folders.json (the route's `fs.rm()` call is a no-op since the folder is already gone, thanks to `force: true`).

### Key Design Decisions

1. **View state simplification.** Remove `"idle"` and `"processing"` from `ViewState`. The library IS the idle state. Processing is tracked by QueuePanel independently. This means `handleFilesSelect` no longer sets `viewState` to `"processing"` — it adds to the queue and the user stays on the library.

2. **Upload flow change.** Currently, `handleFilesSelect` in `page.tsx` does direct SSE processing and shows a ProcessingView. After this work, file selection goes through the existing queue system (`POST /api/queue`). The inline SSE processing code and `ProcessingView` component are removed from `page.tsx`. All processing happens via the queue.

3. **Client-side sort/filter.** The library API already returns all videos in memory. Sort and filter happen in `LibraryView` state — no new API endpoints needed.

4. **`@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder.** Lightweight, well-maintained. Only needed in `FolderView`. Persist via `reorderVideosInFolder()` in `lib/folders.ts` (already implemented) and the existing `PATCH /api/folders/[id]` endpoint (already accepts `{ videoIds }` and calls `reorderVideosInFolder` — no new endpoint needed).

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

Add a `DELETE` handler to the existing `[id]/route.ts`. Steps: (1) resolve the full path to the video folder using `getNotesDirectory()` + decoded ID, (2) call `removeVideoFromAllFolders(videoId)` — a new function in `lib/folders.ts` that iterates all folders and removes the ID from any `videoIds` arrays (always runs, even if folder is already gone from disk), (3) attempt to delete the folder from disk using `fs.rm(path, { recursive: true, force: true })` — if the folder is already gone (e.g., Electron already trashed it), `force: true` prevents ENOENT errors, (4) return `{ success: true }`. Note: no 404 on missing folder — the handler is idempotent. The Electron flow calls `trashItem()` first, so the folder may already be gone when the DELETE handler runs; the handler must still clean up folders.json regardless.

Also add `folder_path` to the library API response. In the existing GET handler at `app/api/class-notes/[id]/route.ts`, the response already includes `id` (the folder name). Add the resolved absolute path as `folder_path: path.join(getNotesDirectory(), id)` so the client can pass it to `electronAPI.trashItem()`. Similarly, ensure the library listing API at `app/api/class-notes/library/route.ts` includes `folder_path` in each record.

The new `removeVideoFromAllFolders` function in `lib/folders.ts`: load `getFoldersData()`, filter the videoId out of every folder's `videoIds` array, save. Follow the pattern of existing `removeVideoFromFolder()` but iterate all folders. A video can legitimately appear in multiple folders (the UI allows adding the same video to different folders), so this function must check all folders.

Satisfies R2 (folder cleanup part).

**Test scenarios:** (`__tests__/api/class-notes-delete.test.ts`)

- DELETE with valid ID → removes folder from disk, cleans folders.json, returns `{ success: true }`
- DELETE with valid ID that's in 2 folders → ID removed from both folders in folders.json
- DELETE with ID whose folder is already gone (Electron already trashed) → still cleans folders.json, returns `{ success: true }` (not 404)
- DELETE with ID not in any folder → still succeeds (just deletes folder from disk)
- `removeVideoFromAllFolders("video-1")` with video in folders A and B → video removed from both, other videos untouched

**Verify:** `npm run test -- class-notes-delete` passes.

#### 2.3 Add delete button and confirmation to LibraryView

**Depends on:** 2.1, 2.2
**Files:** `components/mvp/LibraryView.tsx`, `__tests__/components/LibraryView.test.tsx`

Add a trash icon button to each video row in `LibraryView` (next to the existing reprocess button). On click, show a confirmation dialog (`window.confirm()` — matches existing reprocess pattern). On confirm: (1) if `window.electronAPI?.trashItem` exists, call it with `record.folder_path` (the library API returns this — see note in 2.2 about adding `folder_path` to the response), (2) call `DELETE /api/class-notes/${videoId}` to clean up folders.json and delete from disk (for non-Electron, `fs.rm()` handles deletion; for Electron, the folder is already trashed so the handler skips disk deletion gracefully), (3) remove the video from local state (`setVideos`).

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

Add the same delete pattern (trash icon + confirm + API call) to FolderView video cards and NotesViewer header. In FolderView, the delete button sits alongside the existing "remove from folder" X button — they have different semantics: the X removes the video from this folder only (leaving it in the library), while the trash icon permanently deletes the video (sends to OS trash). Place the trash icon to the left of the X button, visually distinct (red-tinted trash icon vs neutral X). When a video is deleted from a folder, also check if the folder has generated content (`overview.md`, `combined-blog.md`) — these become stale but do not need automatic invalidation in this version (the user can regenerate manually).

In NotesViewer, add a delete button to the header action bar (next to download buttons). After successful delete in NotesViewer, call `onBack()` to return to library.

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

2. Remove `ProcessingView` component and all inline SSE processing code from `handleFilesSelect`. Replace with: create FormData, POST to `/api/queue` (the existing queue endpoint), done. The queue panel handles progress display. This means removing the SSE reader, `ProgressState`, the `STEPS` array, and `getStepIndex` from this file — delete them entirely (the step mapping is redefined inline in QueuePanel in Section 6.1).

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

`useQueueEvents` is not currently imported in `page.tsx` — the current flow is inline SSE. Add the import and hook call. Render `QueuePanel` with the queue state and action handlers (`onRemoveItem`, `onRetryItem`, `onClearCompleted` → existing queue API calls).

When a queue item completes and the user is on the library view, the library should refresh. Add a `useEffect` that watches `queueState.items` for items transitioning to status `"completed"` that were not previously `"completed"`. When detected, increment a `refreshKey` counter passed to `LibraryView` (which triggers its `fetchData()` via a `useEffect` dependency). When the user is on FolderView or NotesViewer, the library does not refresh — it refreshes on next navigation to library view. Batch completions (multiple items completing in quick succession) are handled naturally since each state update increments the counter.

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

**Search:** Filter `videos` array by case-insensitive partial match on `title` and `source_file` basename. Use a `searchQuery` state variable and filter on every keystroke — no debounce needed since the list is bounded and local. Apply filter to both uncategorized videos and the total count display.

**Sort:** Options: "Newest first" (default, `processed_at` desc), "Oldest first" (`processed_at` asc), "Title A-Z" (`title` localeCompare), "Title Z-A" (`title` localeCompare reversed). Use a `sortOption` state variable. Apply sort after filter.

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

Install `@dnd-kit/core` and `@dnd-kit/sortable` as dependencies. In `FolderView`, wrap the video list with `DndContext` and `SortableContext`. Each video card becomes a `useSortable` item. On drag end (`onDragEnd`), compute the new order from `arrayMove`, update local state, and persist by calling `PATCH /api/folders/${folderId}` with `{ videoIds: newOrder }`.

The existing `PATCH /api/folders/[id]` endpoint (in `app/api/folders/[id]/route.ts`) already accepts `{ videoIds }` and calls `reorderVideosInFolder()` from `lib/folders.ts`, which validates all IDs are present. No new endpoint needed.

Use `verticalListSortingStrategy` from `@dnd-kit/sortable`. Add a drag handle (grip icon) to the left of each video card — the existing order number circle can become the drag handle. Use `CSS.Transform.toString(transform)` for the drag visual.

Satisfies R7.

**Test scenarios:** (manual — dnd-kit testing requires complex pointer event simulation)

- Drag handle visible on each video card in folder view
- Dragging a video reorders the list visually
- Dropping saves the new order (verify via page refresh)
- Dragging outside the list cancels the reorder

**Verify:** Manual: open a folder with 3+ videos, drag to reorder, refresh, confirm order persisted.

---

## Section 6: Queue Progress Enhancement

#### 6.1 Add step-level progress display to QueuePanel

**Depends on:** none
**Files:** `components/mvp/QueuePanel.tsx`, `__tests__/components/QueuePanel.test.tsx`

Enhance the progress display in `QueueItemRow` for processing items. Currently shows `item.progress?.message` and a progress bar for chunk counts. Add step-level context: map `item.progress.step` (a string, typed as `string` in `QueueItemProgress` at `lib/queue.ts:8`) to a human-readable label and step number. Define the mapping inline in `QueuePanel.tsx` (QueuePanel is the sole consumer after ProcessingView removal — no shared constant needed):

| `progress.step`  | Label            | Step # |
| ---------------- | ---------------- | ------ |
| `"checking"`     | Checking         | 1/7    |
| `"extracting"`   | Extracting Audio | 2/7    |
| `"transcribing"` | Transcribing     | 3/7    |
| `"summarizing"`  | Generating Notes | 4/7    |
| `"organizing"`   | Organizing       | 5/7    |
| `"blogging"`     | Creating Blog    | 6/7    |
| `"finalizing"`   | Finalizing       | 7/7    |

Display format: `"Transcribing — step 3/7"` below the filename, replacing the current bare `item.progress.message`. For unknown step values (e.g., `"loading"` during reprocess, `"complete"`), show the raw `progress.message` as fallback. Keep the existing chunk progress bar for the transcribing step.

When ProcessingView is removed from `page.tsx` (Section 3.2), delete the `STEPS` array and `getStepIndex` function from that file — they are no longer needed.

Satisfies R8.

**Test scenarios:** (`__tests__/components/QueuePanel.test.tsx`)

- Processing item with `progress.step: "transcribing"` → shows "Transcribing — step 3/7"
- Processing item with `progress.step: "summarizing"` → shows "Generating Notes — step 4/7"
- Processing item with unknown step → shows `progress.message` as fallback
- Processing item with no progress → shows "Processing..." fallback
- Completed items → no step display, just status

**Verify:** `npm run test -- QueuePanel` passes.

---

## Testing Strategy

- **Unit tests:** Vitest with React Testing Library. Follow existing patterns in `__tests__/components/LibraryView.test.tsx` (mock fetch, render component, assert DOM). New test files for: `CompactUploadBar`, `class-notes-delete`. Extend existing `LibraryView.test.tsx` and `QueuePanel.test.tsx`.
- **Integration tests:** The API route test (`class-notes-delete`) tests the full route handler with mocked filesystem.
- **Manual verification:** Each section has specific manual checks. Critical path: upload video → appears in queue → processes → appears in library → sort/filter works → delete sends to trash → drag-reorder in folder persists.

## Risks and Mitigations

| Risk                                                     | Mitigation                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Electron preload script not loading in packaged app      | Test with `npm run electron:build` before merge. Preload path: `app.isPackaged ? path.join(process.resourcesPath, 'preload.js') : path.join(__dirname, 'preload.js')`. In dev mode, `__dirname` resolves to the `electron/` folder. In packaged mode, preload must be in `extraResources` (configured in electron-builder) and loaded via `process.resourcesPath`. |
| `@dnd-kit` bundle size impact                            | `@dnd-kit/core` is ~12KB gzipped, `@dnd-kit/sortable` ~4KB — acceptable for desktop app. Tree-shaking handles unused exports.                                                                                                                                                                                                                                      |
| Queue-based upload is a behavior change                  | Users currently see inline progress. After this change, progress moves to the bottom QueuePanel. The panel auto-expands (already implemented), so it should be discoverable.                                                                                                                                                                                       |
| Removing ProcessingView breaks the upload-and-wait flow  | Users who upload a single file and want to immediately see results will now need to click the completed item in the queue or notice the library refresh. Mitigated by Section 3.3: when a queue item completes, the library auto-refreshes and the QueuePanel already shows a "completed" status. The auto-expanding QueuePanel makes progress discoverable.       |
| `shell.trashItem()` path resolution in packaged Electron | The notes directory path must be absolute. `getNotesDirectory()` already returns an absolute path. Verify in packaged build.                                                                                                                                                                                                                                       |

## Open Questions

None — all decisions resolved during PRD brainstorming and tech planning Q&A.

## Dependency Summary

| New Dependency      | Purpose                 | Size          |
| ------------------- | ----------------------- | ------------- |
| `@dnd-kit/core`     | Drag-and-drop framework | ~12KB gzipped |
| `@dnd-kit/sortable` | Sortable list preset    | ~4KB gzipped  |
