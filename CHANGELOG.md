# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yourusername/videosum/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourusername/videosum/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/videosum/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/yourusername/videosum/releases/tag/v0.0.1
