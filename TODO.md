# VideoSum - Development TODO List

**Status**: Building MVP - Phase 1 Complete
**Current Phase**: Phase 1 - Class Notes Processing (COMPLETED)
**Last Updated**: January 5, 2026

---

## 🚀 Quick Start Checklist

Before you begin development, ensure:

- [x] Node.js 20+ installed
- [x] Python 3.x installed (with venv)
- [x] Git installed and configured
- [x] Code editor ready (VS Code recommended)
- [x] OpenAI API key obtained
- [x] Anthropic API key obtained

---

## ✅ Phase 0: Project Setup - COMPLETED

- [x] Next.js 15 project with TypeScript
- [x] Tailwind CSS and shadcn/ui configured
- [x] Basic project structure created
- [x] ESLint configured
- [x] Vitest testing framework set up (28 tests passing)

---

## ✅ Phase 1: Class Notes Processing MVP - COMPLETED

### Core Features Implemented:

- [x] Python video processing script (`scripts/process_video.py`)
- [x] Web UI for video upload and processing
- [x] Progress tracking with real-time updates
- [x] Notes viewer with markdown rendering
- [x] Transcript viewer with timestamps
- [x] Chat interface for Q&A about notes
- [x] Library view for browsing processed notes

### Batch Video Processing Queue - COMPLETED (January 2026)

- [x] Multi-file upload with drag & drop
- [x] Queue persistence to disk (`~/.videosum/queue.json`)
- [x] Sequential background processing
- [x] Real-time progress via Server-Sent Events (SSE)
- [x] Collapsible queue panel UI
- [x] Cancel/remove/retry operations
- [x] Queue survives app restart
- [x] Unit tests for queue system (28 tests)

### Files Created:

- `lib/queue.ts` - Queue data model and persistence
- `lib/queue-processor.ts` - Singleton background processor
- `lib/settings.ts` - Configuration helpers
- `app/api/queue/route.ts` - Queue CRUD API
- `app/api/queue/[id]/route.ts` - Individual item operations
- `app/api/queue/events/route.ts` - SSE progress stream
- `hooks/useQueueEvents.ts` - React hook for real-time updates
- `components/mvp/QueuePanel.tsx` - Queue UI component
- `__tests__/queue.test.ts` - Queue unit tests
- `__tests__/queue-processor.test.ts` - Processor tests
- `__tests__/settings.test.ts` - Settings tests

---

## 📋 Phase 2: Desktop App (In Progress)

### Electron Packaging:

- [x] Electron builder configured
- [x] Basic DMG packaging working
- [ ] Native file dialogs
- [ ] System tray integration
- [ ] Auto-updater

---

## 📋 Phase 3: Enhanced Features (Planned)

### Priority Features:

- [ ] Custom summary templates
- [ ] Transcript editing interface
- [ ] Video sharing (public links)
- [ ] Export to PDF/Word formats
- [ ] Advanced search within transcripts

---

## 📋 Original Phase 0 Reference (Archived)

<details>
<summary>Click to expand original Phase 0 checklist</summary>

### Day 1: Initialize Project ⏰ Estimated: 2-3 hours

```bash
# Step-by-step commands

# 1. Create Next.js project
npx create-next-app@latest videosum --typescript --tailwind --app --src-dir=false

# Answer prompts:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - src/ directory: No
# - App Router: Yes
# - Import alias: Yes (@/*)

cd videosum

# 2. Install core dependencies
npm install prisma @prisma/client
npm install next-auth@beta  # v5 for App Router
npm install bcryptjs
npm install @types/bcryptjs --save-dev
npm install react-dropzone
npm install @vercel/blob
npm install zod  # For validation

# 3. Install shadcn/ui
npx shadcn-ui@latest init

# Answer prompts:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# 4. Install initial shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add label
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add toast
```

#### Checklist:

- [x] Next.js project created
- [x] Dependencies installed
- [x] shadcn/ui initialized
- [x] UI components added
- [x] Project runs locally (`npm run dev`)

</details>

---

### Day 2: Database Setup ⏰ Estimated: 2-3 hours

#### Option A: Local PostgreSQL with Docker

```bash
# Start PostgreSQL container
docker run --name videosum-db \
  -e POSTGRES_USER=videosum \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=videosum \
  -p 5432:5432 \
  -d postgres:15

# Database URL for .env.local:
# DATABASE_URL="postgresql://videosum:password123@localhost:5432/videosum"
```

#### Option B: Railway PostgreSQL (Recommended)

```bash
# 1. Go to https://railway.app
# 2. Create new project
# 3. Add PostgreSQL service
# 4. Copy DATABASE_URL from Railway dashboard
# 5. Add to .env.local
```

#### Prisma Setup

```bash
# 1. Initialize Prisma
npx prisma init

# 2. Update prisma/schema.prisma with initial models (see below)

# 3. Create .env.local with:
DATABASE_URL="your-database-url-here"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# 4. Run migration
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Test connection (create a test script)
```

#### Initial Prisma Schema

Create `prisma/schema.prisma`:

```prisma
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
  passwordHash  String

  videos        Video[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
}

model Video {
  id          String    @id @default(cuid())
  title       String
  sourceType  String    // "upload", "zoom", "youtube", "meet", "vimeo"
  sourceUrl   String?
  fileUrl     String?
  status      String    @default("pending")

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, createdAt])
}
```

#### Checklist:

- [ ] PostgreSQL database running
- [ ] DATABASE_URL configured in .env.local
- [ ] Prisma schema created
- [ ] Initial migration run
- [ ] Can connect to database

---

### Day 3: Authentication Setup ⏰ Estimated: 3-4 hours

#### File Structure to Create:

```
/lib
  /auth.ts          # NextAuth configuration
  /db.ts            # Prisma client singleton
/app
  /api
    /auth
      /[...nextauth]
        /route.ts   # NextAuth handler
    /signup
      /route.ts     # Signup API
```

#### Create lib/db.ts

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

#### Create lib/auth.ts

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};
```

#### Create API Routes

1. `/app/api/auth/[...nextauth]/route.ts`
2. `/app/api/auth/signup/route.ts`

#### Create Auth Pages

1. `/app/auth/login/page.tsx`
2. `/app/auth/signup/page.tsx`

#### Checklist:

- [ ] NextAuth configured
- [ ] Signup API created
- [ ] Login page created
- [ ] Signup page created
- [ ] Can create account and log in
- [ ] Session persists across pages

---

### Day 4: Basic UI & Layout ⏰ Estimated: 3-4 hours

#### Files to Create:

```
/components
  /nav.tsx          # Navigation component
  /layout
    /dashboard-layout.tsx
/app
  /(dashboard)
    /layout.tsx
    /page.tsx       # Dashboard home
  /page.tsx         # Landing page
```

#### Create Navigation Component

- Logo/branding
- Links: Dashboard, Upload, Profile
- User dropdown with logout
- Mobile responsive menu

#### Create Dashboard Layout

- Sidebar navigation
- Main content area
- Header with user info

#### Create Dashboard Page

- Welcome message
- Stats cards (videos processed, credits remaining)
- Recent videos list
- Upload button

#### Checklist:

- [ ] Navigation component created
- [ ] Dashboard layout functional
- [ ] Landing page created
- [ ] Responsive design works
- [ ] Can navigate between pages

---

### Day 5: File Upload Page ⏰ Estimated: 3-4 hours

#### Create Upload Page: `/app/(dashboard)/upload/page.tsx`

Features:

- Drag-and-drop zone (react-dropzone)
- File type validation (mp4, mov, avi, mkv)
- File size validation (max 2GB)
- Preview video metadata
- Upload progress bar
- Submit button

#### Create Upload API: `/app/api/videos/upload/route.ts`

```typescript
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Upload to Vercel Blob
  const blob = await put(`videos/${file.name}`, file, {
    access: "public",
  });

  // Save to database
  const video = await prisma.video.create({
    data: {
      title: title || file.name,
      sourceType: "upload",
      fileUrl: blob.url,
      status: "uploaded",
      userId: session.user.id,
    },
  });

  return NextResponse.json({ video });
}
```

#### Checklist:

- [ ] Upload page UI created
- [ ] File validation working
- [ ] Upload to Vercel Blob working
- [ ] Video saved to database
- [ ] Can see uploaded video in dashboard

---

## 📋 Phase 1: Core Features (Weeks 2-3)

### Week 2: Video Management

#### Videos List Page

- [ ] Create `/app/(dashboard)/videos/page.tsx`
- [ ] Fetch user's videos from database
- [ ] Display as cards with thumbnails
- [ ] Show status badges
- [ ] Add search/filter functionality
- [ ] Implement pagination

#### Video Detail Page

- [ ] Create `/app/(dashboard)/videos/[id]/page.tsx`
- [ ] Display video metadata
- [ ] Show processing status
- [ ] Add delete functionality
- [ ] Breadcrumb navigation

#### Video API Routes

- [ ] `GET /api/videos` - List videos
- [ ] `GET /api/videos/:id` - Get single video
- [ ] `DELETE /api/videos/:id` - Delete video
- [ ] `GET /api/videos/:id/status` - Get processing status

---

### Week 3: URL-Based Video Input

#### Add URL Input to Upload Page

- [ ] Tab interface (Upload File | Paste URL)
- [ ] URL input field
- [ ] Platform detection (auto-detect Zoom/YouTube/etc)
- [ ] Preview video info from URL
- [ ] Validation

#### Platform Detection Utility

```typescript
// lib/platform-detector.ts

export type Platform = "zoom" | "youtube" | "meet" | "vimeo" | "unknown";

export function detectPlatform(url: string): Platform {
  if (url.includes("zoom.us")) return "zoom";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("drive.google.com")) return "meet";
  if (url.includes("vimeo.com")) return "vimeo";
  return "unknown";
}
```

#### Create URL Processing API

- [ ] `POST /api/videos/from-url`
- [ ] Validate URL
- [ ] Detect platform
- [ ] Save video record with sourceUrl
- [ ] Queue for processing

---

## 📋 Phase 2: Video Processing (Weeks 4-6)

### Week 4: Transcript Extraction

#### Set Up External Dependencies

```bash
# Install FFmpeg (for audio extraction)
# macOS:
brew install ffmpeg

# Linux:
sudo apt-get install ffmpeg

# Docker (add to Dockerfile if deploying):
RUN apt-get update && apt-get install -y ffmpeg
```

```bash
# Install Node packages
npm install fluent-ffmpeg
npm install @types/fluent-ffmpeg --save-dev
npm install axios  # For API calls
```

#### Create Transcript Extractors

- [ ] `/lib/transcript/zoom.ts` - Zoom API integration
- [ ] `/lib/transcript/youtube.ts` - YouTube transcript extractor
- [ ] `/lib/transcript/meet.ts` - Google Meet (Drive API)
- [ ] `/lib/transcript/vimeo.ts` - Vimeo API
- [ ] `/lib/transcript/deepgram.ts` - Deepgram fallback

#### YouTube Transcript Example

```typescript
// lib/transcript/youtube.ts

import axios from "axios";

export async function getYouTubeTranscript(videoId: string) {
  // Use youtube-transcript-api via Python subprocess
  // OR use a Node.js library like 'youtube-transcript'
  const response = await axios.get(
    `https://youtube.com/api/timedtext?lang=en&v=${videoId}`,
  );
  // Parse and format transcript
  return parseTranscript(response.data);
}
```

#### Checklist:

- [ ] Can extract transcript from YouTube URL
- [ ] Can extract transcript from Zoom URL
- [ ] Deepgram integration working for local videos
- [ ] Transcripts saved to database
- [ ] Can view transcript in UI

---

### Week 5: Frame Extraction

#### Install Dependencies

```bash
npm install sharp  # Image processing
```

#### Create Frame Extractor

```typescript
// lib/video/frame-extractor.ts

import ffmpeg from "fluent-ffmpeg";
import { put } from "@vercel/blob";

export async function extractFrames(videoUrl: string, videoId: string) {
  const frames: string[] = [];

  // Use FFmpeg to extract frames
  // Every 15 seconds or on scene changes
  await new Promise((resolve, reject) => {
    ffmpeg(videoUrl)
      .screenshots({
        timestamps: [
          "10%",
          "20%",
          "30%",
          "40%",
          "50%",
          "60%",
          "70%",
          "80%",
          "90%",
        ],
        filename: "frame-%i.png",
        folder: `/tmp/${videoId}`,
      })
      .on("end", resolve)
      .on("error", reject);
  });

  // Upload frames to Vercel Blob
  // Store frame URLs in database

  return frames;
}
```

#### Implement Scene Detection (Advanced)

```bash
# Use FFmpeg scene detection filter
ffmpeg -i input.mp4 -filter:v "select='gt(scene,0.3)'" -vsync vfr output_%04d.png
```

#### Checklist:

- [ ] Can extract frames from video
- [ ] Frames uploaded to storage
- [ ] Frame records saved to database
- [ ] Can view frames in UI
- [ ] Scene detection working

---

### Week 6: Job Queue System

#### Set Up Redis

```bash
# Local development (Docker)
docker run --name videosum-redis -p 6379:6379 -d redis:7

# OR use Redis Cloud (free tier)
# Get connection URL from cloud.redis.io
```

#### Install BullMQ

```bash
npm install bullmq
npm install ioredis
```

#### Create Job Queue

```typescript
// lib/queue/video-processor.ts

import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL!);

export const videoQueue = new Queue("video-processing", { connection });

// Add job
export async function queueVideoProcessing(videoId: string) {
  await videoQueue.add("process-video", { videoId });
}

// Worker
const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId } = job.data;

    // 1. Extract transcript
    await job.updateProgress(25);

    // 2. Extract frames
    await job.updateProgress(50);

    // 3. AI analysis
    await job.updateProgress(75);

    // 4. Generate summary
    await job.updateProgress(100);
  },
  { connection },
);
```

#### Create Worker Process

- [ ] Separate worker process or API route
- [ ] Handle job failures and retries
- [ ] Update video status in database
- [ ] Send completion notifications

#### Checklist:

- [ ] Redis running and connected
- [ ] Job queue functional
- [ ] Videos processed in background
- [ ] Status updates in real-time
- [ ] Error handling works

---

## 📋 Phase 3: AI Analysis (Weeks 7-8)

### Week 7: AI Integration

#### Set Up OpenAI

```bash
npm install openai
```

```typescript
// lib/ai/openai.ts

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeTranscript(transcript: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert at summarizing meeting transcripts.",
      },
      {
        role: "user",
        content: `Summarize this meeting transcript:\n\n${transcript}`,
      },
    ],
  });

  return response.choices[0].message.content;
}
```

#### Implement AI Functions

- [ ] `summarizeTranscript()` - Generate executive summary
- [ ] `extractKeyPoints()` - Extract bullet points
- [ ] `extractActionItems()` - Find action items
- [ ] `analyzeFrame()` - Multimodal analysis of frames
- [ ] `classifyFrame()` - Detect slide vs speaker

#### Checklist:

- [ ] OpenAI API working
- [ ] Can generate summaries
- [ ] Can analyze images
- [ ] Results saved to database

---

### Week 8: Markdown Generation

#### Create Markdown Generator

```typescript
// lib/markdown/generator.ts

export function generateMarkdown(data: {
  title: string;
  summary: string;
  keyPoints: string[];
  transcript: string;
  frames: Frame[];
}) {
  return `
# ${data.title}

## Executive Summary
${data.summary}

## Key Takeaways
${data.keyPoints.map((point) => `- ${point}`).join("\n")}

## Visual Highlights
${data.frames
  .map(
    (frame) => `
### ${frame.description} (${formatTimestamp(frame.timestamp)})
![Frame](${frame.imageUrl})
`,
  )
  .join("\n")}

## Full Transcript
${data.transcript}
`;
}
```

#### Create Summary Viewer

- [ ] Markdown rendering component
- [ ] Table of contents
- [ ] Image lightbox
- [ ] Copy to clipboard
- [ ] Download button

#### Checklist:

- [ ] Markdown generated correctly
- [ ] Can view summary in browser
- [ ] Can download .md file
- [ ] Images embedded properly

---

## 📋 Phase 4: Polish & Launch (Weeks 9-10)

### Week 9: UI/UX

- [ ] Improve dashboard design
- [ ] Add empty states
- [ ] Better loading indicators
- [ ] Error messages
- [ ] Success notifications
- [ ] Mobile optimization
- [ ] Dark mode (optional)

### Week 10: Testing & Deployment

#### Testing

- [ ] Unit tests for utilities
- [ ] Integration tests for APIs
- [ ] E2E tests with Playwright
- [ ] Manual testing of full flow

#### Deployment

- [ ] Deploy to Vercel
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up monitoring (Sentry)
- [ ] Test in production

---

## 🎯 Current Focus

**RIGHT NOW**: Phase 0, Day 1 - Initialize Project

**Next 3 Tasks**:

1. Create Next.js project with TypeScript
2. Install all dependencies
3. Initialize shadcn/ui

---

## 📝 Notes & Learnings

(Add notes as you develop)

-
-
- ***

## 🐛 Known Issues

(Track bugs here)

-
- ***

  **Last Action**: Created TODO list
  **Next Action**: Run `npx create-next-app@latest videosum`
