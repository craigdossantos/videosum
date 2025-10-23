# VideoSum 🎥 → 📝

> Transform meeting videos into comprehensive Markdown summaries with embedded screenshots

**Status**: Planning → Ready to Build
**Version**: 0.1.0-alpha
**Last Updated**: October 16, 2025

---

## 📖 Overview

VideoSum automatically converts meeting videos into rich, visual documentation by:
- 📝 Extracting transcripts from Zoom, YouTube, Google Meet, Vimeo (or generating with AI)
- 🎬 Capturing screenshots of presentations and slides
- 🤖 AI-powered summarization with key points and action items
- 📄 Generating downloadable Markdown files with embedded images

**Cost-Efficient**: Leverages existing platform transcripts (90% cost reduction vs full transcription)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or Railway)
- OpenAI API key (for AI summarization)
- Vercel account (for deployment)

### Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd videosum

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Set up database
npx prisma migrate dev --name init

# 5. Run development server
npm run dev
```

Visit `http://localhost:3000`

---

## 📚 Documentation

### Core Documents

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
  - Market analysis, user personas, technical architecture
  - Cost analysis and pricing strategy
  - Database schema and API specifications

- **[ROADMAP.md](ROADMAP.md)** - Development roadmap with milestones
  - 10-week plan broken down by phase
  - Detailed implementation timeline
  - Success criteria for each phase

- **[TODO.md](TODO.md)** - Actionable task list for iterative development
  - Day-by-day tasks for Phase 0-1
  - Step-by-step instructions with code examples
  - Current focus tracking

- **[AGENTS.md](AGENTS.md)** - AI Agent strategy for bug reduction
  - Specialized agents for code review, type safety, research
  - Context scoping patterns
  - Practical workflows for common tasks

### Getting Started

**New to the project?**
1. Read [PRD.md](PRD.md) Executive Summary (5 min)
2. Review [ROADMAP.md](ROADMAP.md) Phase 1 (10 min)
3. Start with [TODO.md](TODO.md) Day 1 tasks (2 hours)

**Ready to code?**
- Follow [TODO.md](TODO.md) step-by-step
- Use [AGENTS.md](AGENTS.md) for code review and optimization
- Reference [PRD.md](PRD.md) for technical specs

---

## 🏗️ Architecture

```
┌──────────────┐
│   Next.js    │  Frontend + API Routes
│  TypeScript  │
└──────┬───────┘
       │
┌──────▼────────────────────────┐
│  Processing Pipeline          │
│  ┌────────┐  ┌──────────────┐│
│  │Transcript│  │Frame Extract││
│  │Extractor │  │(FFmpeg)     ││
│  └────────┘  └──────────────┘│
└──────┬────────────────────────┘
       │
┌──────▼───────┐  ┌────────────┐
│   AI (GPT)   │  │  Storage   │
│ Summarization│  │(Vercel Blob)│
└──────────────┘  └────────────┘
```

### Tech Stack

**Frontend/Backend**:
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL

**Processing**:
- FFmpeg (frame extraction)
- BullMQ + Redis (job queue)
- OpenAI GPT-4o mini (AI)
- Deepgram Nova-3 (transcription fallback)

**Deployment**:
- Vercel (hosting)
- Railway (database)
- Redis Cloud (job queue)

---

## 💰 Cost Analysis

### Per-Video Costs

| Scenario | Transcription | AI | Storage | **Total** |
|----------|--------------|-----|---------|-----------|
| **Zoom/YouTube** (80%) | $0.00 | $0.022 | $0.006 | **$0.028** |
| **Local video** (20%) | $0.46 | $0.022 | $0.006 | **$0.488** |
| **Blended average** | - | - | - | **$0.120** |

### Pricing Strategy

**Freemium Model**:
- Free: 2 videos/month
- Pro: $29/month (20 videos)
- Team: $99/month (100 videos)

**Pay-per-video**:
- Single: $4.99
- 10-pack: $39.99 ($4 each)
- 50-pack: $149.99 ($3 each)

**Margins**: 6-28x depending on tier

---

## 🗺️ Development Roadmap

### Phase 0: Project Setup (Week 1) ⏰ Current
- [ ] Initialize Next.js with TypeScript
- [ ] Set up Prisma + PostgreSQL
- [ ] Configure authentication (NextAuth.js)
- [ ] Build file upload page
- [ ] Create basic dashboard

### Phase 1: Core Infrastructure (Weeks 2-3)
- [ ] User management and auth flows
- [ ] Video upload (local files + URLs)
- [ ] Video list and detail pages
- [ ] Platform detection (Zoom, YouTube, Meet, Vimeo)

### Phase 2: Video Processing (Weeks 4-6)
- [ ] Transcript extraction (platform-specific)
- [ ] Frame extraction (FFmpeg)
- [ ] Job queue system (BullMQ)
- [ ] Real-time progress updates

### Phase 3: AI Integration (Weeks 7-8)
- [ ] OpenAI integration (summarization)
- [ ] Visual analysis (frame classification)
- [ ] Markdown generation
- [ ] Download functionality

### Phase 4: Polish & Launch (Weeks 9-10)
- [ ] UI/UX improvements
- [ ] Testing (unit, integration, E2E)
- [ ] Performance optimization
- [ ] Deployment to production

**See [ROADMAP.md](ROADMAP.md) for detailed timeline**

---

## 🤖 AI Agent-Assisted Development

This project uses specialized AI agents to ensure quality:

- **code-reviewer**: Security audits, vulnerability detection
- **typescript-pro**: Type safety, interface design
- **Explore**: Codebase navigation, dependency analysis
- **javascript-pro**: Async optimization, performance tuning
- **search-specialist**: API research, best practices
- **mermaid-expert**: Visual documentation

**See [AGENTS.md](AGENTS.md) for usage guide**

---

## 📊 Success Metrics

### Technical
- Processing time: < 2x video duration
- Uptime: > 99.5%
- Successful processing: > 95%
- Transcription accuracy: > 90% WER

### Business
- Free to paid conversion: > 10%
- MRR growth: > 30% MoM
- Gross margin: > 70%

---

## 🔒 Security

- JWT authentication (7-day expiry)
- Bcrypt password hashing (cost factor 12)
- Input validation and sanitization
- Rate limiting on API endpoints
- File upload validation (type, size, content)
- No sensitive data in logs
- GDPR & CCPA compliant

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- auth

# Run E2E tests (Playwright)
npm run test:e2e

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

---

## 📝 Contributing

### Development Workflow

1. **Pick a task** from [TODO.md](TODO.md)
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Use agents** as guided in [AGENTS.md](AGENTS.md)
4. **Write tests** for new functionality
5. **Run code review**: Use `code-reviewer` agent before committing
6. **Create PR** with description and screenshots

### Code Standards

- TypeScript strict mode (no `any` types)
- ESLint + Prettier for formatting
- Write tests for critical paths (>70% coverage)
- Document complex functions
- Use meaningful commit messages

---

## 🐛 Troubleshooting

### Common Issues

**Database connection fails**:
```bash
# Check DATABASE_URL in .env.local
# Verify PostgreSQL is running
docker ps # if using Docker
```

**FFmpeg not found**:
```bash
# Install FFmpeg
# macOS:
brew install ffmpeg

# Linux:
sudo apt-get install ffmpeg
```

**OpenAI API errors**:
```bash
# Verify OPENAI_API_KEY in .env.local
# Check API quota at platform.openai.com
```

**Vercel Blob upload fails**:
```bash
# Verify BLOB_READ_WRITE_TOKEN in .env.local
# Check Vercel dashboard for storage limits
```

---

## 📞 Support

- **Documentation**: See docs in this repo
- **Issues**: Create GitHub issue with reproduction steps
- **Questions**: Open a discussion on GitHub

---

## 📄 License

[Your License Here]

---

## 🙏 Acknowledgments

- Next.js team for amazing framework
- Anthropic for Claude AI capabilities
- OpenAI for GPT-4o mini
- Deepgram for transcription API
- Vercel for hosting and storage

---

## 🗺️ What's Next?

**Immediate**:
1. Complete Phase 0 setup (Week 1)
2. Build core video management (Weeks 2-3)
3. Implement processing pipeline (Weeks 4-6)

**Near-term** (Months 3-4):
- Q&A interface for meeting queries
- Team workspaces and collaboration
- Notion and Confluence integrations

**Long-term** (Months 5-6+):
- Real-time meeting bot (join Zoom/Meet live)
- Multi-language support
- Mobile apps
- Enterprise features (SSO, custom branding)

**See [PRD.md](PRD.md) for full future roadmap**

---

**Ready to build?** Start with [TODO.md](TODO.md) → Day 1 Tasks

**Need context?** Read [PRD.md](PRD.md) → Executive Summary

**Want to optimize?** Use [AGENTS.md](AGENTS.md) → Agent workflows
