# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-01-08

### Added

- **Custom App Icon**: Video-to-notes icon showing video player transforming into document
  - SVG source with purple video player, gradient arrow, green notes icon
  - Generated PNG (1024x1024), ICNS (macOS), and ICO (Windows) formats
  - Icon generation script: `scripts/generate-icons.mjs`
- **Icon Dependencies**: Added `sharp` and `png-to-ico` for icon generation

### Fixed

- **Electron Build**: Fixed "Failed to start application server" error on launch
  - Root cause: `node_modules` folder not being copied to packaged app
  - Added explicit `extraResources` entry for `.next/standalone/node_modules`
- **TypeScript Error**: Fixed optional `folder_name` property usage in `app/demo/page.tsx`
  - Added null guards before `encodeURIComponent` calls

## [0.2.1] - 2026-01-06

### Added

- **Video Reprocess Feature**: Regenerate summaries from existing transcripts without re-transcribing
  - New reprocess button in library view
  - API endpoint: `/api/class-notes/[id]/reprocess`
  - `reprocess_notes()` function in Python script
  - Saves time and API costs by reusing existing transcripts
- **Queue Panel Auto-Show**: Queue panel now appears immediately after video upload
- **Enhanced Progress Display**: Progress messages now show more prominently during processing

### Fixed

- **Queue Panel Visibility**: Fixed issue where queue panel didn't appear after upload
  - Added immediate state refresh after successful upload
  - Queue state now updates synchronously via fetch before SSE
- **Cancel Button**: Fixed 404 errors when removing items from queue
  - Now treats 404 as success (item already removed)
- **Reprocess Function**: Fixed Python script calling non-existent `summarize()` function
  - Changed to use `generate_notes()` instead
  - Now loads duration from metadata
  - Extracts title from regenerated notes
- **Next.js 15 Compatibility**: Fixed async params handling in reprocess endpoint
  - Changed `params: { id: string }` to `params: Promise<{ id: string }>`
  - Added `await params` before accessing properties
- **Processor Method Call**: Fixed incorrect method name `processNext()` → `start()`

### Changed

- **Queue Processor**: Reprocess items now handled differently (no temp file deletion)
- **Library View**: Added reprocess button with spinning icon during processing
- **Metadata Updates**: Reprocessed videos now update title and costs correctly

## [0.2.0] - 2026-01-05

### Added

- **Typography System**: Georgia serif font (20px desktop, 18px mobile) for improved readability
- **YouTube Color Palette**: Authentic YouTube brand colors (#065fd4 blue, #ff0000 red, #0f0f0f text)
- **Collapsible Sections**: Auto-parsed markdown sections with expand/collapse functionality
  - Overview (opens by default)
  - Core Concepts
  - Stories & Examples
  - Exercises & Practices
  - Key Insights
- **Export Functionality**: Download and copy-to-clipboard for markdown summaries
- **Copy Buttons**: Individual copy buttons for each collapsible section
- **NotesViewerCollapsible Component**: New component for enhanced notes viewing experience
- **ExportButton Component**: Dropdown menu with copy and download options
- **Test Route**: `/test-summary` page for demonstrating SummaryView features
- **Responsive Typography**: `.reading-prose` and `.reading-prose-mobile` utility classes

### Fixed

- **Video Processing Bug**: Changed Python script to return `folder_id` instead of `folder_name`
- **CLI Argument Handling**: Added argparse support for `--folder` optional argument
- **Processing Errors**: Resolved "Invalid result format" errors during video processing
- **Queue Processing**: Verified successful sequential processing with test videos

### Changed

- **Demo Page**: Updated to use `NotesViewerCollapsible` for improved UX
- **SummaryView**: Enhanced with collapsible sections and export functionality
- **NotesViewer**: Improved typography and spacing

### Dependencies

- Added `@radix-ui/react-collapsible` for collapsible UI components
- Added `lucide-react` icons (ChevronDown, ChevronRight, Copy, Check)

## [0.1.0] - 2026-01-02

### Added

- **Batch Processing Queue**: Multi-file upload and sequential background processing
- **Queue Persistence**: Queue state saved to `~/.videosum/queue.json`
- **Real-time Progress**: Server-Sent Events (SSE) for live progress updates
- **Queue UI**: Collapsible queue panel with cancel/remove/retry operations
- **Unit Tests**: 28 passing tests for queue, processor, and settings

### Features

- Python script for local video processing
- OpenAI Whisper transcription integration
- Anthropic Claude AI summarization
- Markdown output with structured notes
- Web UI with drag & drop upload
- Processing progress tracking
- Notes viewer with markdown rendering
- Transcript viewer with timestamps
- Chat interface for Q&A about notes
- Library view for browsing processed notes

## [0.0.1] - 2025-10-16

### Added

- Initial project setup
- Next.js 15 with App Router
- TypeScript configuration
- Tailwind CSS
- Basic project documentation (PRD, ROADMAP, TODO, AGENTS)

---

[Unreleased]: https://github.com/yourusername/videosum/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/yourusername/videosum/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/yourusername/videosum/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/videosum/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/yourusername/videosum/releases/tag/v0.0.1
