# VideoSum - Product Requirements Document
**Version**: 1.0
**Date**: October 16, 2025
**Status**: Planning Phase

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Market Opportunity](#market-opportunity)
4. [User Personas](#user-personas)
5. [Feature Requirements](#feature-requirements)
6. [Technical Architecture](#technical-architecture)
7. [Cost Analysis & Economics](#cost-analysis--economics)
8. [Data Models](#data-models)
9. [API Specifications](#api-specifications)
10. [Security & Privacy](#security--privacy)
11. [Success Metrics](#success-metrics)
12. [Risks & Mitigations](#risks--mitigations)
13. [Future Roadmap](#future-roadmap)

---

## 1. Executive Summary

### Problem Statement
Meeting participants often struggle to capture comprehensive notes during video meetings, especially when presentations, screen shares, and visual content are shared. Traditional transcripts miss the visual context that's critical to understanding what was discussed.

### Solution
VideoSum is a web-based application that transforms meeting videos into comprehensive Markdown summaries with embedded screenshots of presentations and visual content. It leverages existing platform transcripts (Zoom, YouTube, Google Meet) when available, dramatically reducing costs while providing rich, visual documentation of meetings.

### Key Differentiators
- **Visual Context**: Captures screenshots of presentations, slides, and screen shares
- **Cost-Efficient**: Uses existing platform transcripts (90% cost reduction)
- **Markdown Output**: Easy to integrate with note-taking systems (Notion, Obsidian, etc.)
- **Multi-Platform**: Supports Zoom, YouTube, Google Meet, Vimeo, and local videos
- **AI-Powered**: Intelligent summarization with action item extraction

### Target Users
- Remote workers who attend frequent video meetings
- Product managers documenting feature discussions
- Students reviewing lecture recordings
- Sales teams documenting client calls
- Executives reviewing board meetings

---

## 2. Product Vision

### Mission
Eliminate the burden of manual note-taking by automatically generating comprehensive, visually-rich meeting documentation that captures both what was said and what was shown.

### Vision Statement
"Every meeting video becomes an actionable, searchable document with full visual context within minutes of completion."

### Core Values
1. **Accuracy**: High-fidelity transcription and summarization
2. **Efficiency**: Process videos faster than real-time
3. **Privacy**: User data ownership and security
4. **Accessibility**: Make meeting content searchable and reviewable
5. **Cost-Effectiveness**: Leverage existing resources to minimize processing costs

---

## 3. Market Opportunity

### Market Size
- Global video conferencing market: $8.5B (2024)
- AI meeting assistants market: $1.2B and growing 25% YoY
- 70M+ Zoom meetings daily
- 500M+ hours of YouTube content watched daily

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Price |
|------------|-----------|------------|-------|
| Otter.ai | Real-time transcription, good accuracy | No visual capture, limited formats | $17-30/mo |
| Fireflies.ai | Multi-platform, good integrations | Expensive, no screenshot extraction | $10-19/mo |
| Tactiq | Chrome extension, easy to use | Limited to live meetings, no video processing | $8-20/mo |
| Grain | Good for sales calls, video highlights | Expensive, not general purpose | $19-59/mo |
| **VideoSum** | **Visual capture, Markdown output, cost-efficient** | **New to market** | **$2-5/video** |

### Competitive Advantages
1. **Visual Context Capture**: Only solution that extracts presentation screenshots
2. **Markdown Output**: Appeals to technical users and knowledge workers
3. **Hybrid Transcript Strategy**: 90% lower operating costs than competitors
4. **Platform Agnostic**: Works with recorded videos, not just live meetings
5. **No Subscription Lock-in**: Pay-per-video pricing option

---

## 4. User Personas

### Persona 1: Sarah - Product Manager
**Demographics**: 32, works remotely, 8-12 meetings/week
**Goals**: Document feature discussions, track decisions, share meeting outcomes
**Pain Points**: Can't capture screenshots of designs shown during meetings, manual note-taking misses details
**Use Case**: Upload weekly sprint planning videos, get summaries with embedded design screenshots

### Persona 2: David - MBA Student
**Demographics**: 27, attends online lectures, reviews YouTube educational content
**Goals**: Study efficiently, create notes from recorded lectures
**Pain Points**: Rewatching long lectures is time-consuming, can't easily reference slides shown
**Use Case**: Process professor's Zoom recordings to create study guides with lecture slides

### Persona 3: Jennifer - Sales Director
**Demographics**: 38, manages team of 15, reviews client calls
**Goals**: Coach team, identify common objections, track commitments
**Pain Points**: No time to watch full sales calls, needs quick summaries with action items
**Use Case**: Process sales demo recordings to extract key moments and presentations shown

### Persona 4: Alex - Content Creator
**Demographics**: 29, creates educational content, interviews experts
**Goals**: Create show notes, blog posts, and social media content from interviews
**Pain Points**: Manual transcription is expensive, needs timestamps and key moments
**Use Case**: Upload YouTube interviews to generate blog posts with embedded screenshots

---

## 5. Feature Requirements

### 5.1 Phase 1: MVP (Minimum Viable Product)

#### P0 Features (Must Have)
- ✅ **Local Video Upload**
  - Support: MP4, MOV, AVI, MKV (up to 2GB)
  - Drag-and-drop interface
  - Progress indicator during upload

- ✅ **URL-Based Video Input**
  - Zoom recording URLs
  - YouTube video URLs
  - Google Meet recording URLs (via Drive)
  - Vimeo video URLs

- ✅ **Hybrid Transcript Extraction**
  - Detect video source automatically
  - Fetch existing transcripts from platforms (Zoom, YouTube, Meet, Vimeo)
  - Fall back to Deepgram API for local videos
  - Speaker diarization when available

- ✅ **Intelligent Frame Extraction**
  - Scene change detection using FFmpeg
  - Extract 1 frame every 10-30 seconds as baseline
  - Prioritize frames with significant visual changes (slide transitions)
  - Store frames with timestamps

- ✅ **AI-Powered Summarization**
  - Executive summary (2-3 paragraphs)
  - Key takeaways (bullet points)
  - Detailed timeline with timestamps
  - Action items extraction
  - Topic segmentation

- ✅ **Visual Analysis**
  - Identify presentation slides vs. talking heads
  - OCR for text extraction from slides
  - Describe charts, diagrams, and visual content
  - Flag important visual moments

- ✅ **Markdown Generation**
  - Structured format with sections
  - Embedded images with captions
  - Timestamp links for reference
  - Downloadable .md file with assets

- ✅ **Processing Status**
  - Real-time progress updates
  - Estimated time remaining
  - Error handling with clear messages

- ✅ **Basic User Management**
  - Email authentication
  - Processing history
  - Usage tracking

#### P1 Features (Should Have)
- 🔄 **Enhanced Transcript Editing**
  - Manual correction interface
  - Speaker name assignment
  - Timestamp adjustment

- 🔄 **Custom Templates**
  - Choose summary format (detailed vs. brief)
  - Custom Markdown templates
  - Section reordering

- 🔄 **Batch Processing**
  - Upload multiple videos at once
  - Bulk export

- 🔄 **Search & Filter**
  - Search within transcripts
  - Filter by date, duration, source
  - Tag videos

#### P2 Features (Nice to Have)
- 💡 **Advanced Visual Detection**
  - Automatic slide deck extraction
  - Detect and extract charts separately
  - Whiteboard content recognition

- 💡 **Collaboration**
  - Share summaries with team
  - Commenting on specific sections
  - Team workspaces

- 💡 **Integrations**
  - Export to Notion
  - Export to Confluence
  - Slack notifications
  - Google Drive sync

### 5.2 Phase 2: Enhanced Features

#### Q&A Interface
- Ask questions about meeting content
- Natural language queries: "What did Sarah say about the budget?"
- Retrieve answers with timestamps and context
- RAG (Retrieval-Augmented Generation) implementation

#### Advanced Analytics
- Meeting sentiment analysis
- Speaking time distribution
- Topic frequency analysis
- Action item tracking across meetings

#### Real-Time Processing
- Join meetings live via bot
- Real-time transcription and frame capture
- Instant summary generation post-meeting

#### Multi-Language Support
- Auto-detect language
- Transcribe in 50+ languages
- Translate summaries

### 5.3 Phase 3: Enterprise Features

#### Team Management
- Organization accounts
- Role-based access control
- Shared libraries
- Usage analytics

#### Custom Integrations
- API for developers
- Webhooks for automation
- Custom AI models
- White-label options

#### Compliance & Security
- SOC 2 compliance
- GDPR compliance
- SSO (Single Sign-On)
- Data retention policies

---

## 6. Technical Architecture

### 6.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │   Upload   │  │   Status    │  │  Summary View    │    │
│  │   Page     │  │   Monitor   │  │  (Markdown)      │    │
│  └────────────┘  └─────────────┘  └──────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ API Routes
┌────────────────────────▼────────────────────────────────────┐
│                    Backend (Next.js API)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Upload    │  │   Process    │  │   Export         │  │
│  │   Handler   │  │   Manager    │  │   Generator      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼────────────────┐
         │               │                │
┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼────────┐
│   Storage     │ │  Database  │ │  Job Queue    │
│ (Vercel Blob) │ │ PostgreSQL │ │ (BullMQ/Redis)│
└───────────────┘ └────────────┘ └───────────────┘
         │               │                │
┌────────▼───────────────▼────────────────▼─────────────────┐
│              Processing Pipeline (Workers)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Transcript  │  │    Frame     │  │   AI Analysis  │ │
│  │  Extractor   │  │  Extractor   │  │   & Summary    │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
└────────────────────────────────────────────────────────────┘
         │                   │                    │
┌────────▼──────┐  ┌─────────▼─────┐  ┌──────────▼────────┐
│   Platform    │  │    FFmpeg     │  │  OpenAI/Gemini    │
│   APIs        │  │   (Video      │  │   API             │
│ (Zoom/YT/etc) │  │  Processing)  │  │                   │
└───────────────┘  └───────────────┘  └───────────────────┘
```

### 6.2 Tech Stack Details

#### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Server Components
- **File Upload**: React Dropzone + Vercel Blob
- **Markdown Rendering**: react-markdown + remark/rehype plugins

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5+
- **Job Queue**: BullMQ + Redis (for async processing)
- **Caching**: Redis for session and result caching

#### Video Processing
- **Primary**: FFmpeg (via fluent-ffmpeg npm package)
- **Alternative**: Python microservice (if heavy processing needed)
  - FastAPI
  - OpenCV for advanced frame analysis
  - Scene detection with PySceneDetect

#### External APIs & Services

**Transcript Extraction**:
- Zoom Cloud Recording API (OAuth 2.0)
- youtube-transcript-api (Python library)
- Google Drive API (for Meet recordings)
- Vimeo API
- Deepgram Nova-3 (fallback for local videos)

**AI/ML Services**:
- **Primary**: OpenAI GPT-4o mini
  - Summarization
  - Visual analysis (multimodal)
  - Action item extraction

- **Alternative**: Google Gemini 1.5 Flash
  - Lower cost at scale
  - 2M token context window
  - Native video processing

**Storage**:
- Vercel Blob (videos, frames, assets)
- Cloudinary (alternative for image CDN)

**Deployment**:
- Vercel (frontend + API)
- Railway or Render (Python microservice if needed)
- Redis Cloud (job queue and caching)

### 6.3 Processing Pipeline

```typescript
// Detailed Processing Flow

1. VIDEO INGESTION
   ├─ User uploads video or provides URL
   ├─ Validate file type and size
   ├─ Upload to Vercel Blob storage
   └─ Create Video record in database (status: "uploaded")

2. SOURCE DETECTION
   ├─ Parse URL to detect platform (Zoom, YouTube, Meet, Vimeo)
   ├─ If local file: prepare for full processing
   └─ If platform URL: check for existing transcript

3. TRANSCRIPT EXTRACTION (Parallel with Frame Extraction)
   ├─ Platform-specific handlers:
   │  ├─ Zoom: GET /meetings/{id}/recordings → extract transcript
   │  ├─ YouTube: youtube-transcript-api.get_transcript(video_id)
   │  ├─ Google Meet: Google Drive API → download .sbv file
   │  ├─ Vimeo: Vimeo API → fetch captions
   │  └─ Local: Extract audio → Deepgram API
   ├─ Parse transcript format (VTT, SRT, JSON)
   ├─ Store in Transcript model
   └─ Update status: "transcript_complete"

4. FRAME EXTRACTION (Parallel with Transcript Extraction)
   ├─ Download video if URL-based
   ├─ FFmpeg scene detection:
   │  ffmpeg -i input.mp4 -filter:v "select='gt(scene,0.3)'" -vsync vfr frames/frame_%04d.png
   ├─ Fallback: Time-based extraction (1 frame per 15-30 seconds)
   ├─ Upload frames to Vercel Blob
   ├─ Store Frame records with timestamps
   └─ Update status: "frames_complete"

5. AI ANALYSIS
   ├─ A. Transcript Analysis (GPT-4o mini or Gemini)
   │  ├─ Generate executive summary
   │  ├─ Extract key points
   │  ├─ Identify topics and segments
   │  ├─ Extract action items
   │  └─ Detect sentiment and tone
   │
   └─ B. Visual Analysis (GPT-4o mini multimodal)
      ├─ For each extracted frame:
      │  ├─ Classify: presentation slide vs. speaker view
      │  ├─ Extract text (OCR)
      │  ├─ Describe visual content
      │  └─ Assign importance score
      ├─ Filter important frames (slides, charts, diagrams)
      └─ Update status: "analysis_complete"

6. MARKDOWN GENERATION
   ├─ Load template based on user preferences
   ├─ Combine transcript analysis + visual analysis
   ├─ Structure sections:
   │  ├─ Executive Summary
   │  ├─ Key Takeaways
   │  ├─ Detailed Timeline (with timestamps)
   │  ├─ Visual Highlights (embedded frames)
   │  ├─ Action Items
   │  └─ Full Transcript (collapsible)
   ├─ Embed images with relative paths
   ├─ Store Summary model
   └─ Update status: "completed"

7. CLEANUP & NOTIFICATION
   ├─ Delete temporary files
   ├─ Send completion notification (email/webhook)
   └─ Log processing metrics
```

### 6.4 Data Flow Diagram

```
User → Upload Video → Storage → Job Queue
                                      ↓
                          ┌───────────┴────────────┐
                          │                        │
                    Transcript Worker        Frame Worker
                          │                        │
                    ┌─────▼─────┐           ┌─────▼─────┐
                    │ Platform  │           │  FFmpeg   │
                    │   APIs    │           │ Processor │
                    └─────┬─────┘           └─────┬─────┘
                          │                        │
                          └───────────┬────────────┘
                                      ↓
                               AI Analysis Worker
                                      ↓
                              Markdown Generator
                                      ↓
                              Store in Database
                                      ↓
                              Notify User
```

---

## 7. Cost Analysis & Economics

### 7.1 Processing Cost Breakdown

#### Scenario A: Video with Platform Transcript (80% of cases)
Example: 1-hour Zoom meeting

| Service | Usage | Cost per Video |
|---------|-------|----------------|
| Transcript Extraction | Zoom API (free) | $0.00 |
| Frame Extraction | FFmpeg (compute) | $0.001 |
| AI Summarization | GPT-4o mini (15k tokens) | $0.012 |
| Visual Analysis | GPT-4o mini (10 frames) | $0.010 |
| Storage | 500MB video + 10 frames | $0.005 |
| **Total** | | **$0.028** |

#### Scenario B: Local Video without Transcript (20% of cases)
Example: 1-hour local MP4 recording

| Service | Usage | Cost per Video |
|---------|-------|----------------|
| Transcript Generation | Deepgram Nova-3 | $0.460 |
| Frame Extraction | FFmpeg (compute) | $0.001 |
| AI Summarization | GPT-4o mini (15k tokens) | $0.012 |
| Visual Analysis | GPT-4o mini (10 frames) | $0.010 |
| Storage | 500MB video + 10 frames | $0.005 |
| **Total** | | **$0.488** |

#### Blended Cost (80% platform, 20% local)
**Average cost per video**: (0.80 × $0.028) + (0.20 × $0.488) = **$0.120 per video**

### 7.2 Infrastructure Costs (Monthly)

Assuming 1,000 videos processed per month:

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Vercel Pro | Hosting + Functions | $20 |
| Vercel Blob | 500GB storage + 1TB bandwidth | $30 |
| Railway PostgreSQL | Hobby plan | $5 |
| Redis Cloud | 30MB cache | $0 (free tier) |
| Video Processing | 1,000 videos × $0.120 | $120 |
| **Total** | | **$175/month** |

**Cost per video including infrastructure**: $0.175

### 7.3 Pricing Strategy

#### Option 1: Pay-Per-Video
- Single video processing: **$4.99**
- 10-pack: **$39.99** ($4.00 each)
- 50-pack: **$149.99** ($3.00 each)

**Margins**:
- Single: 28x ($4.99 / $0.175)
- 50-pack: 17x ($3.00 / $0.175)

#### Option 2: Subscription
- **Starter**: $19/month (10 videos) = $1.90/video
- **Professional**: $49/month (30 videos) = $1.63/video
- **Business**: $149/month (150 videos) = $1.00/video

**Margins**:
- Starter: 11x
- Professional: 9x
- Business: 6x

#### Option 3: Freemium
- **Free**: 2 videos/month (with watermark)
- **Pro**: $29/month (20 videos)
- **Team**: $99/month (100 videos + team features)

### 7.4 Break-Even Analysis

**Fixed Costs**: $55/month (Vercel + Database + Redis)
**Variable Cost**: $0.120/video

**Break-even calculations**:
- At $4.99/video: Need 12 videos/month
- At $29/month subscription (20 videos): Need 2 customers
- At 100 videos/month: Total cost = $55 + $12 = $67

**Conclusion**: Very low break-even threshold, high margin potential

### 7.5 Cost Optimization Strategies

1. **Transcript Caching**: Store platform transcripts to avoid re-fetching
2. **Frame Deduplication**: Skip frames with minimal visual changes
3. **Batch Processing**: Group multiple videos for efficiency
4. **CDN for Images**: Use Cloudinary free tier for frame delivery
5. **Prompt Optimization**: Reduce token usage in AI calls
6. **Smart Model Selection**: Use Claude Haiku 4.5 (free tier) when possible
7. **Lazy Loading**: Only process frames that appear important

### 7.6 Scaling Economics

| Monthly Volume | Processing Cost | Infrastructure | Total Cost | Revenue (@$2/video) | Margin |
|----------------|-----------------|----------------|------------|---------------------|--------|
| 100 videos | $12 | $55 | $67 | $200 | 66% |
| 500 videos | $60 | $75 | $135 | $1,000 | 87% |
| 1,000 videos | $120 | $175 | $295 | $2,000 | 85% |
| 5,000 videos | $600 | $500 | $1,100 | $10,000 | 89% |
| 10,000 videos | $1,200 | $1,200 | $2,400 | $20,000 | 88% |

**Key Insight**: Margins improve with scale due to fixed infrastructure costs becoming a smaller percentage.

---

## 8. Data Models

### 8.1 Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?

  // OAuth
  googleId      String?   @unique
  avatarUrl     String?

  // Subscription
  plan          String    @default("free") // free, pro, business
  creditsRemaining Int    @default(2)
  subscriptionId String?

  // Relationships
  videos        Video[]

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  @@index([email])
}

model Video {
  id            String    @id @default(cuid())

  // Basic Info
  title         String
  description   String?   @db.Text
  originalFilename String?

  // Source
  sourceType    String    // "upload", "zoom", "youtube", "meet", "vimeo"
  sourceUrl     String?

  // File Info
  fileUrl       String?   // Stored video file
  fileSize      Int?      // bytes
  mimeType      String?

  // Video Metadata
  duration      Int?      // seconds
  width         Int?
  height        Int?
  fps           Float?
  hasAudio      Boolean   @default(true)

  // Processing
  status        String    @default("pending") // pending, uploading, processing, completed, failed
  processingStartedAt DateTime?
  processingCompletedAt DateTime?
  errorMessage  String?   @db.Text

  // Cost Tracking
  transcriptCost Float    @default(0)
  aiCost        Float     @default(0)
  storageCost   Float     @default(0)
  totalCost     Float     @default(0)

  // Relationships
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  transcript    Transcript?
  summary       Summary?
  frames        Frame[]

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, createdAt])
  @@index([status])
}

model Transcript {
  id            String    @id @default(cuid())
  videoId       String    @unique
  video         Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)

  // Content
  content       String    @db.Text
  language      String?   @default("en")

  // Structure
  segments      Json?     // Array of {start, end, text, speaker}
  speakers      Json?     // Speaker diarization data {id, name, segments}

  // Source
  source        String    // "platform", "deepgram", "manual"
  sourceFormat  String?   // "vtt", "srt", "json"

  // Quality Metrics
  confidence    Float?    // Average confidence score
  wordCount     Int?

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([videoId])
}

model Summary {
  id                String   @id @default(cuid())
  videoId           String   @unique
  video             Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)

  // Markdown
  markdown          String   @db.Text
  markdownUrl       String?  // URL to .md file in storage

  // Structured Content
  executiveSummary  String   @db.Text
  keyPoints         Json     // Array of strings
  actionItems       Json?    // Array of {text, assignee?, dueDate?, timestamp}
  topics            Json?    // Array of {name, startTime, endTime, description}

  // Sentiment
  overallSentiment  String?  // positive, neutral, negative
  sentimentScore    Float?   // -1 to 1

  // Metadata
  model             String   // AI model used
  promptTokens      Int?
  completionTokens  Int?

  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([videoId])
}

model Frame {
  id            String    @id @default(cuid())
  videoId       String
  video         Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)

  // Image Info
  imageUrl      String
  thumbnailUrl  String?
  fileSize      Int?      // bytes
  width         Int?
  height        Int?

  // Timing
  timestamp     Int       // milliseconds from start
  frameNumber   Int?

  // Classification
  frameType     String    @default("general") // slide, speaker, chart, whiteboard, screen_share, general
  isKeyFrame    Boolean   @default(false)
  importanceScore Float   @default(0.5) // 0-1

  // Analysis
  description   String?   @db.Text
  extractedText String?   @db.Text // OCR results
  objects       Json?     // Detected objects/entities

  // Metadata
  analyzed      Boolean   @default(false)
  analysisModel String?

  // Timestamps
  createdAt     DateTime  @default(now())

  @@index([videoId, timestamp])
  @@index([videoId, isKeyFrame])
}

model ProcessingJob {
  id            String    @id @default(cuid())
  videoId       String

  // Job Info
  type          String    // "transcript", "frames", "analysis", "summary"
  status        String    @default("queued") // queued, running, completed, failed
  priority      Int       @default(0)

  // Progress
  progress      Float     @default(0) // 0-100
  currentStep   String?

  // Error Handling
  attempts      Int       @default(0)
  maxAttempts   Int       @default(3)
  errorMessage  String?   @db.Text

  // Timing
  queuedAt      DateTime  @default(now())
  startedAt     DateTime?
  completedAt   DateTime?

  @@index([status, priority])
  @@index([videoId])
}
```

---

## 9. API Specifications

### 9.1 Core Endpoints

#### Authentication
```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

#### Videos
```
POST /api/videos/upload
POST /api/videos/from-url
GET /api/videos
GET /api/videos/:id
DELETE /api/videos/:id
GET /api/videos/:id/status
```

#### Summaries
```
GET /api/videos/:id/summary
GET /api/videos/:id/summary/download
POST /api/videos/:id/summary/regenerate
GET /api/videos/:id/export
```

See full API documentation in separate API.md file.

---

## 10. Security & Privacy

### 10.1 Authentication & Authorization
- JWT with 7-day expiry
- OAuth 2.0 (Google, Microsoft)
- Role-based access control (RBAC)
- API key authentication for programmatic access

### 10.2 Data Security
- TLS 1.3 for all communications
- AES-256 encryption for stored videos
- Hashed passwords (bcrypt, cost factor 12)
- Signed URLs for temporary access

### 10.3 Privacy
- User owns all content
- No AI training on user data
- GDPR & CCPA compliant
- Data retention: 30 days (configurable)

---

## 11. Success Metrics

### Technical Metrics
- Processing time: < 2x video duration
- Uptime: > 99.5%
- Successful processing rate: > 95%
- Transcription accuracy: > 90% WER

### User Metrics
- CSAT: > 4.5/5
- NPS: > 50
- Free to paid conversion: > 10%

### Business Metrics
- MRR growth: > 30% MoM
- LTV:CAC ratio: > 3:1
- Gross margin: > 70%

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| High processing costs | High | Use platform transcripts, smart frame extraction |
| Slow processing times | High | Optimize FFmpeg, job queue, horizontal scaling |
| Storage costs escalate | Medium | Delete after 30 days, compression, quotas |
| Platform API changes | Medium | Monitor announcements, versioned adapters |

---

## 13. Future Roadmap

### Phase 1: MVP (Months 1-2)
- Core video processing
- Hybrid transcript extraction
- Markdown generation with screenshots
- Basic user management

### Phase 2: Enhanced Features (Months 3-4)
- Q&A interface
- Team workspaces
- Notion/Confluence integrations
- Advanced analytics

### Phase 3: Enterprise (Months 5-6)
- SSO and team management
- Real-time meeting bot
- Custom branding
- API platform

### Long-Term Vision
- Multi-language support
- Mobile apps
- Advanced AI insights
- Marketplace for templates

---

**Document Owner**: Product Team
**Last Updated**: October 16, 2025
**Next Review**: November 16, 2025
