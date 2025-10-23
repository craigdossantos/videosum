# VideoSum - Development Roadmap & TODO

**Last Updated**: October 16, 2025
**Status**: Planning Phase → Implementation

---

## Development Phases

### Phase 0: Project Setup (Week 1)
**Goal**: Establish development environment and core infrastructure

- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Set up Tailwind CSS and shadcn/ui
- [ ] Configure Prisma with PostgreSQL
- [ ] Set up development database (local or Railway)
- [ ] Configure environment variables
- [ ] Set up Git repository and initial commit
- [ ] Create basic project structure
- [ ] Set up ESLint and Prettier
- [ ] Configure testing framework (Jest + React Testing Library)

**Deliverables**:
- Working Next.js app with basic routing
- Database connection established
- Development environment configured

---

### Phase 1: Core Infrastructure (Weeks 2-3)
**Goal**: Build foundational features for video upload and storage

#### Week 2: User Authentication & Database
- [ ] Implement user authentication (NextAuth.js)
  - [ ] Email/password signup and login
  - [ ] Session management with JWT
  - [ ] Protected routes and middleware
- [ ] Set up Prisma schema
  - [ ] User model
  - [ ] Video model
  - [ ] Transcript model
  - [ ] Summary model
  - [ ] Frame model
- [ ] Create database migrations
- [ ] Build user profile page
- [ ] Implement basic dashboard UI

#### Week 3: File Upload & Storage
- [ ] Integrate Vercel Blob storage
  - [ ] Configure upload API
  - [ ] Handle large file uploads (chunked upload)
- [ ] Create video upload page
  - [ ] Drag-and-drop interface (react-dropzone)
  - [ ] File validation (type, size)
  - [ ] Upload progress indicator
- [ ] Store video metadata in database
- [ ] Create video list/gallery view
- [ ] Implement video detail page

**Deliverables**:
- Users can sign up, log in, and upload videos
- Videos stored in Vercel Blob
- Basic UI for viewing uploaded videos

---

### Phase 2: Video Processing Pipeline (Weeks 4-6)
**Goal**: Implement core video processing capabilities

#### Week 4: Transcript Extraction
- [ ] Implement URL parsing and platform detection
  - [ ] Zoom URL parser
  - [ ] YouTube URL parser
  - [ ] Google Meet URL parser
  - [ ] Vimeo URL parser
- [ ] Build platform-specific transcript extractors
  - [ ] Zoom API integration (OAuth + transcript fetch)
  - [ ] YouTube transcript extraction (youtube-transcript-api)
  - [ ] Google Meet transcript (Google Drive API)
  - [ ] Vimeo API integration
- [ ] Implement Deepgram integration (fallback)
  - [ ] Audio extraction from video (FFmpeg)
  - [ ] Send to Deepgram API
  - [ ] Parse and store transcript
- [ ] Create transcript storage and retrieval
- [ ] Build transcript viewer UI

#### Week 5: Frame Extraction
- [ ] Set up FFmpeg integration
  - [ ] Install FFmpeg binary or use fluent-ffmpeg
  - [ ] Create FFmpeg wrapper functions
- [ ] Implement scene detection algorithm
  - [ ] Time-based extraction (baseline)
  - [ ] Scene change detection (advanced)
- [ ] Extract and store frames
  - [ ] Upload to Vercel Blob
  - [ ] Create Frame records with timestamps
- [ ] Build frame gallery UI
- [ ] Implement frame filtering (deduplicate similar frames)

#### Week 6: Job Queue System
- [ ] Set up BullMQ + Redis
  - [ ] Configure Redis connection
  - [ ] Create job queue instances
- [ ] Implement background workers
  - [ ] Transcript extraction worker
  - [ ] Frame extraction worker
  - [ ] AI analysis worker
- [ ] Add job status tracking
- [ ] Create real-time progress updates (WebSockets or polling)
- [ ] Implement error handling and retries
- [ ] Build job monitoring UI

**Deliverables**:
- Videos are automatically processed (transcript + frames)
- Background job processing with status updates
- Users can view transcripts and extracted frames

---

### Phase 3: AI Analysis & Summarization (Weeks 7-8)
**Goal**: Generate intelligent summaries with visual analysis

#### Week 7: AI Integration
- [ ] Set up OpenAI API (GPT-4o mini)
  - [ ] Configure API keys
  - [ ] Create API wrapper functions
- [ ] Implement transcript summarization
  - [ ] Executive summary generation
  - [ ] Key points extraction
  - [ ] Topic segmentation
  - [ ] Action items extraction
- [ ] Implement visual analysis (multimodal)
  - [ ] Frame classification (slide vs speaker)
  - [ ] OCR for text extraction
  - [ ] Visual content description
  - [ ] Importance scoring
- [ ] Store AI-generated content
- [ ] Add cost tracking per video

#### Week 8: Markdown Generation
- [ ] Create Markdown template system
  - [ ] Default template
  - [ ] Custom template support
- [ ] Build Markdown generator
  - [ ] Combine transcript + visual analysis
  - [ ] Embed images with captions
  - [ ] Add timestamps and links
  - [ ] Format action items
- [ ] Implement Markdown preview
- [ ] Create download functionality
  - [ ] .md file download
  - [ ] .zip with images
- [ ] Build summary viewer UI (render Markdown)

**Deliverables**:
- AI-powered summaries with key insights
- Markdown files with embedded screenshots
- Users can view and download complete summaries

---

### Phase 4: Polish & MVP Launch (Weeks 9-10)
**Goal**: Refine UX, fix bugs, and prepare for launch

#### Week 9: UI/UX Improvements
- [ ] Enhance dashboard
  - [ ] Video cards with thumbnails
  - [ ] Status indicators
  - [ ] Search and filtering
- [ ] Improve upload experience
  - [ ] Better progress indicators
  - [ ] Error messages and retry options
- [ ] Refine summary viewer
  - [ ] Better Markdown rendering
  - [ ] Table of contents
  - [ ] Copy to clipboard
- [ ] Add settings page
  - [ ] User profile management
  - [ ] API keys display
  - [ ] Usage statistics
- [ ] Mobile responsiveness
- [ ] Accessibility improvements

#### Week 10: Testing & Bug Fixes
- [ ] Write comprehensive tests
  - [ ] Unit tests for utilities
  - [ ] Integration tests for API routes
  - [ ] E2E tests with Playwright
- [ ] Performance optimization
  - [ ] Optimize database queries
  - [ ] Implement caching
  - [ ] Lazy loading for images
- [ ] Security audit
  - [ ] Check authentication flows
  - [ ] Validate input sanitization
  - [ ] Review API rate limiting
- [ ] Load testing
  - [ ] Test with multiple concurrent videos
  - [ ] Stress test job queue
- [ ] Bug fixes and polish

**Deliverables**:
- Production-ready MVP
- Tested and optimized
- Ready for initial users

---

### Phase 5: Enhanced Features (Weeks 11-14)
**Goal**: Add advanced capabilities based on user feedback

#### Features to Implement:
- [ ] Batch video processing
- [ ] Custom summary templates
- [ ] Transcript editing interface
- [ ] Video sharing (public links)
- [ ] Team workspaces (multi-user)
- [ ] Integration with Notion
- [ ] Integration with Confluence
- [ ] Advanced search within transcripts
- [ ] Video tagging and organization
- [ ] Export to PDF/Word formats

---

### Phase 6: Q&A Interface (Weeks 15-16)
**Goal**: Enable natural language queries about meeting content

- [ ] Implement RAG (Retrieval-Augmented Generation)
  - [ ] Embed transcripts using OpenAI embeddings
  - [ ] Store embeddings in vector database (Pinecone/Supabase)
  - [ ] Implement similarity search
- [ ] Build Q&A interface
  - [ ] Chat UI for asking questions
  - [ ] Context retrieval from transcript
  - [ ] Answer generation with citations
  - [ ] Timestamp references
- [ ] Add query history
- [ ] Optimize for speed and cost

---

### Phase 7: Enterprise Features (Weeks 17-20)
**Goal**: Prepare for enterprise customers

- [ ] Team management
  - [ ] Organization accounts
  - [ ] Team member invitations
  - [ ] Role-based permissions
- [ ] SSO integration (SAML)
- [ ] Advanced analytics dashboard
- [ ] Webhook support
- [ ] Public API for developers
- [ ] White-label options
- [ ] Custom branding
- [ ] Compliance certifications (SOC 2, GDPR)

---

## Detailed TODO List (Phase 0-1)

### Immediate Next Steps (Week 1)

#### Day 1: Project Initialization
```bash
# Tasks for Day 1
- [ ] Create Next.js project: npx create-next-app@latest videosum
- [ ] Install dependencies:
  - [ ] Prisma: npm install prisma @prisma/client
  - [ ] Tailwind CSS: (included in Next.js setup)
  - [ ] shadcn/ui: npx shadcn-ui@latest init
  - [ ] Auth: npm install next-auth
  - [ ] File upload: npm install react-dropzone
- [ ] Initialize Git repo
- [ ] Create .env.local with placeholder variables
- [ ] Set up basic folder structure:
  /app
    /api
      /auth
      /videos
    /(dashboard)
      /page.tsx
    /(upload)
      /page.tsx
  /components
    /ui (shadcn components)
  /lib
    /db.ts (Prisma client)
    /auth.ts (NextAuth config)
  /prisma
    /schema.prisma
```

#### Day 2: Database Setup
```bash
# Tasks for Day 2
- [ ] Write Prisma schema (User, Video models)
- [ ] Set up PostgreSQL database:
  - Option A: Local (Docker: docker run --name videosum-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres)
  - Option B: Railway (create project, get DATABASE_URL)
- [ ] Update DATABASE_URL in .env.local
- [ ] Run initial migration: npx prisma migrate dev --name init
- [ ] Generate Prisma client: npx prisma generate
- [ ] Test database connection
```

#### Day 3: Authentication
```bash
# Tasks for Day 3
- [ ] Configure NextAuth.js
  - [ ] Create /app/api/auth/[...nextauth]/route.ts
  - [ ] Set up CredentialsProvider
  - [ ] Add session management
- [ ] Create auth pages:
  - [ ] /app/auth/signup/page.tsx
  - [ ] /app/auth/login/page.tsx
- [ ] Implement signup API: /app/api/auth/signup/route.ts
- [ ] Add password hashing (bcrypt)
- [ ] Create protected route middleware
- [ ] Test signup and login flow
```

#### Day 4: Basic UI Components
```bash
# Tasks for Day 4
- [ ] Install shadcn/ui components:
  - [ ] npx shadcn-ui@latest add button
  - [ ] npx shadcn-ui@latest add card
  - [ ] npx shadcn-ui@latest add input
  - [ ] npx shadcn-ui@latest add form
  - [ ] npx shadcn-ui@latest add dropdown-menu
- [ ] Create layout component with navigation
- [ ] Build dashboard page skeleton
- [ ] Create upload page skeleton
- [ ] Add loading states and error handling
```

#### Day 5: File Upload Setup
```bash
# Tasks for Day 5
- [ ] Set up Vercel Blob:
  - [ ] npm install @vercel/blob
  - [ ] Add BLOB_READ_WRITE_TOKEN to .env.local
- [ ] Create upload API route: /app/api/videos/upload/route.ts
- [ ] Implement file upload handler
- [ ] Add file validation (size, type)
- [ ] Test video upload end-to-end
```

---

## Metrics & Success Criteria

### Phase 0-1 Success Criteria
- ✅ User can sign up and log in
- ✅ User can upload a video file
- ✅ Video is stored and retrievable
- ✅ Basic UI is functional and responsive

### Phase 2 Success Criteria
- ✅ Transcript extracted from platform URLs (80%+ success rate)
- ✅ Frames extracted from videos (1 frame per 15-30 seconds)
- ✅ Processing completes within 2x video duration
- ✅ Job queue handles concurrent processing

### Phase 3 Success Criteria
- ✅ AI summary generated with key points and action items
- ✅ Visual analysis identifies slides vs speakers (>90% accuracy)
- ✅ Markdown file downloadable with embedded images
- ✅ Processing cost < $0.20 per video

### Phase 4 Success Criteria
- ✅ MVP tested with 10+ beta users
- ✅ Bug count < 5 critical issues
- ✅ Page load time < 2 seconds
- ✅ Mobile responsive on all pages

---

## Development Best Practices

### Code Quality
- [ ] Write TypeScript with strict mode
- [ ] Use ESLint and Prettier
- [ ] Write tests for critical paths (>70% coverage)
- [ ] Code reviews for all PRs
- [ ] Document complex functions

### Git Workflow
- [ ] Work on feature branches
- [ ] Meaningful commit messages
- [ ] Squash commits before merge
- [ ] Tag releases (v0.1.0, v0.2.0, etc.)

### Performance
- [ ] Use React Server Components where possible
- [ ] Optimize images (next/image)
- [ ] Implement caching (Redis)
- [ ] Monitor bundle size
- [ ] Use lazy loading

### Security
- [ ] Validate all user inputs
- [ ] Sanitize outputs (prevent XSS)
- [ ] Use parameterized queries (Prisma)
- [ ] Implement rate limiting
- [ ] Regular dependency updates

---

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| **M1: Project Setup** | Week 1 | 🔴 Not Started |
| **M2: Core Infrastructure** | Week 3 | 🔴 Not Started |
| **M3: Video Processing** | Week 6 | 🔴 Not Started |
| **M4: AI Summarization** | Week 8 | 🔴 Not Started |
| **M5: MVP Launch** | Week 10 | 🔴 Not Started |
| **M6: Enhanced Features** | Week 14 | 🔴 Not Started |
| **M7: Q&A Interface** | Week 16 | 🔴 Not Started |
| **M8: Enterprise Ready** | Week 20 | 🔴 Not Started |

---

## Risk Register

| Risk | Mitigation | Owner |
|------|------------|-------|
| FFmpeg installation issues | Use Docker or serverless functions | DevOps |
| API rate limits (OpenAI) | Implement queuing and batching | Backend |
| Storage costs too high | Delete videos after 30 days | Product |
| Slow processing times | Optimize FFmpeg flags, use queue | Backend |
| Platform API changes | Version adapters, monitor docs | Backend |

---

## Questions & Decisions

### Open Questions
- [ ] Which AI model to use for MVP? (GPT-4o mini vs Gemini 1.5 Flash)
- [ ] Should we support video download from URLs in Phase 1?
- [ ] What's the max video duration for free tier?
- [ ] Do we need real-time processing status via WebSockets?

### Decisions Made
- ✅ Use Vercel Blob for storage (not S3) - easier Next.js integration
- ✅ PostgreSQL over MongoDB - better for relational data
- ✅ BullMQ for job queue - Redis-backed, reliable
- ✅ Start with GPT-4o mini - easier integration, good docs

---

## Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Deepgram API Docs](https://developers.deepgram.com)
- [FFmpeg Docs](https://ffmpeg.org/documentation.html)

### Tools & Services
- **Hosting**: Vercel
- **Database**: Railway PostgreSQL
- **Storage**: Vercel Blob
- **Queue**: BullMQ + Redis Cloud
- **Analytics**: Vercel Analytics
- **Monitoring**: Sentry (error tracking)

---

**Next Action**: Begin Phase 0 - Project Setup (Day 1)
