# feat: Reusable AI Artifacts Module

**Created:** 2025-12-30
**Revised:** 2025-12-30 (Post-Review)
**Status:** Ready for Implementation
**Complexity:** MORE (Standard Issue)

---

## Overview

Build a **reusable "context + AI chat + artifact creation" module** (`lib/ai-artifacts/`) that can be extracted and used across multiple projects. The pattern: provide context (markdown/text), chat with Claude about it, and create saveable artifacts (learning points, blog posts, infographics).

**First consumer:** VideoSum class notes app (Mac desktop via Electron)
**Future consumers:** Any project with context + chat + artifacts pattern

---

## Problem Statement / Motivation

The user wants to build the NotebookLM/Claude Desktop artifacts pattern once and reuse it across multiple projects:

> "I don't want to do it over and over again for a web app, for a mobile app, for a desktop app... I generally have a few different projects which are about context and then answering questions and having a chatbot be knowledgeable about that specific context."

The original plan built a **feature tightly coupled to "class notes"**. This revision creates a **reusable abstraction** that any project can consume.

---

## Design Principles (From Review Feedback)

1. **Storage Abstraction** - Don't hardcode file paths; use an interface
2. **No New Dependencies** - Keep existing Anthropic SDK, skip Vercel AI SDK
3. **Tool Calling Over Regex** - Use Claude's tool use for structured artifact creation
4. **Simple Types** - One generic artifact type for MVP, not four predefined types
5. **Desktop Only** - Remove all mobile/responsive code (Mac app)
6. **Auto-Save** - No confirmation dialogs; save artifacts automatically

---

## Architecture

```mermaid
graph TB
    subgraph "Reusable Module: lib/ai-artifacts/"
        Types[types.ts]
        Storage[storage.ts - Interface]
        ToolCall[tool-calling.ts]

        subgraph "Storage Implementations"
            FS[file-storage.ts]
            API[api-storage.ts - Future]
            SQLite[sqlite-storage.ts - Future]
        end
    end

    subgraph "Reusable UI: components/ai-artifacts/"
        Chat[ChatWithArtifacts.tsx]
        Card[ArtifactCard.tsx]
    end

    subgraph "App-Specific: VideoSum"
        NV[NotesViewer.tsx]
        Route[/api/.../artifacts/route.ts]
    end

    NV --> Chat
    Chat --> ToolCall
    Chat --> Storage
    Storage --> FS
    Route --> FS
    ToolCall --> |Claude API| Anthropic
```

### Key Abstraction: Storage Interface

```typescript
// lib/ai-artifacts/storage.ts
export interface ArtifactStorage {
  list(contextId: string): Promise<Artifact[]>;
  save(contextId: string, artifact: CreateArtifactInput): Promise<Artifact>;
  delete(contextId: string, artifactId: string): Promise<void>;
}
```

**This is the key to reusability.** Different projects implement this interface differently:

- **VideoSum (this app):** File system storage in `~/ClassNotes/[id]/`
- **Future web app:** API routes + Postgres
- **Future Electron app:** SQLite

---

## Technical Implementation

### File Structure

```
lib/ai-artifacts/
  index.ts              # Public exports
  types.ts              # Artifact, CreateArtifactInput types
  storage.ts            # ArtifactStorage interface
  file-storage.ts       # File system implementation
  tool-calling.ts       # Claude tool definition for artifacts

components/ai-artifacts/
  ChatWithArtifacts.tsx # Main chat component with artifact creation
  ArtifactCard.tsx      # Single artifact display
  ArtifactsList.tsx     # List of artifacts with empty state
```

### 1. Types (`lib/ai-artifacts/types.ts`)

```typescript
export interface Artifact {
  id: string;
  title: string;
  content: string; // Markdown
  createdAt: string;
  prompt: string; // Original user request
}

export interface CreateArtifactInput {
  title: string;
  content: string;
  prompt: string;
}

// For infographics (future)
export interface InfographicArtifact extends Artifact {
  imageUrl?: string; // From NanoBanana
}
```

### 2. Storage Interface (`lib/ai-artifacts/storage.ts`)

```typescript
import { Artifact, CreateArtifactInput } from "./types";

export interface ArtifactStorage {
  list(contextId: string): Promise<Artifact[]>;
  save(contextId: string, input: CreateArtifactInput): Promise<Artifact>;
  delete(contextId: string, artifactId: string): Promise<void>;
}
```

### 3. File System Implementation (`lib/ai-artifacts/file-storage.ts`)

```typescript
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Artifact, CreateArtifactInput } from "./types";
import { ArtifactStorage } from "./storage";

interface ArtifactsFile {
  version: 1;
  artifacts: Artifact[];
}

export function createFileStorage(baseDir: string): ArtifactStorage {
  const getPath = (contextId: string) =>
    path.join(baseDir, contextId, "artifacts.json");

  const readFile = async (contextId: string): Promise<ArtifactsFile> => {
    try {
      const data = await fs.readFile(getPath(contextId), "utf-8");
      return JSON.parse(data);
    } catch {
      return { version: 1, artifacts: [] };
    }
  };

  const writeFile = async (contextId: string, data: ArtifactsFile) => {
    await fs.writeFile(getPath(contextId), JSON.stringify(data, null, 2));
  };

  return {
    async list(contextId) {
      const data = await readFile(contextId);
      return data.artifacts;
    },

    async save(contextId, input) {
      const data = await readFile(contextId);
      const artifact: Artifact = {
        id: `art_${randomUUID().slice(0, 8)}`,
        ...input,
        createdAt: new Date().toISOString(),
      };
      data.artifacts.unshift(artifact);
      await writeFile(contextId, data);
      return artifact;
    },

    async delete(contextId, artifactId) {
      const data = await readFile(contextId);
      data.artifacts = data.artifacts.filter((a) => a.id !== artifactId);
      await writeFile(contextId, data);
    },
  };
}
```

### 4. Claude Tool Calling (`lib/ai-artifacts/tool-calling.ts`)

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const CREATE_ARTIFACT_TOOL: Anthropic.Tool = {
  name: "save_artifact",
  description:
    "Save content as a reusable artifact when the user asks you to create, generate, or make something they might want to keep (learning points, summaries, blog posts, etc.)",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "A descriptive title for the artifact",
      },
      content: {
        type: "string",
        description: "The full markdown content of the artifact",
      },
    },
    required: ["title", "content"],
  },
};

export interface ArtifactToolInput {
  title: string;
  content: string;
}

export function isArtifactToolUse(
  block: Anthropic.ContentBlock,
): block is Anthropic.ToolUseBlock & { name: "save_artifact" } {
  return block.type === "tool_use" && block.name === "save_artifact";
}
```

### 5. Main Chat Component (`components/ai-artifacts/ChatWithArtifacts.tsx`)

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { ArtifactStorage } from '@/lib/ai-artifacts/storage';
import { Artifact } from '@/lib/ai-artifacts/types';
import { CREATE_ARTIFACT_TOOL, isArtifactToolUse, ArtifactToolInput } from '@/lib/ai-artifacts/tool-calling';
import { ArtifactCard } from './ArtifactCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWithArtifactsProps {
  contextId: string;
  context: string;  // The markdown/text context
  storage: ArtifactStorage;
  onArtifactCreated?: (artifact: Artifact) => void;
  systemPrompt?: string;
}

export function ChatWithArtifacts({
  contextId,
  context,
  storage,
  onArtifactCreated,
  systemPrompt,
}: ChatWithArtifactsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load artifacts on mount
  useEffect(() => {
    storage.list(contextId).then(setArtifacts);
  }, [contextId, storage]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const defaultSystemPrompt = `You are a helpful AI assistant. The user has provided context they want to discuss.

## Context
${context}

## Your Capabilities
- Answer questions about the context
- Create learning summaries, blog posts, or other written content
- When asked to CREATE or GENERATE something, use the save_artifact tool

Be concise and helpful.`;

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-artifacts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: systemPrompt || defaultSystemPrompt,
          contextId,
        }),
      });

      const data = await response.json();

      // Handle assistant response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.text || '',
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Handle artifact creation
      if (data.artifact) {
        const saved = await storage.save(contextId, {
          title: data.artifact.title,
          content: data.artifact.content,
          prompt: input,
        });
        setArtifacts(prev => [saved, ...prev]);
        onArtifactCreated?.(saved);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, contextId, storage, systemPrompt, defaultSystemPrompt, onArtifactCreated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDelete = async (artifactId: string) => {
    await storage.delete(contextId, artifactId);
    setArtifacts(prev => prev.filter(a => a.id !== artifactId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Ask questions about the content or request artifacts.</p>
            <p className="text-sm mt-2">Try: "Create a summary of the key points"</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-50 ml-8'
                  : 'bg-gray-50 mr-8'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-gray-50 mr-8 p-3 rounded-lg">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}
      </div>

      {/* Artifacts inline */}
      {artifacts.length > 0 && (
        <div className="border-t p-4 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Saved Artifacts ({artifacts.length})
          </p>
          <div className="space-y-2">
            {artifacts.slice(0, 3).map(artifact => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onDelete={() => handleDelete(artifact.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or request an artifact..."
            rows={1}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. API Route (`app/api/ai-artifacts/chat/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  CREATE_ARTIFACT_TOOL,
  isArtifactToolUse,
} from "@/lib/ai-artifacts/tool-calling";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { messages, systemPrompt } = await request.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    tools: [CREATE_ARTIFACT_TOOL],
    messages,
  });

  // Extract text and artifact from response
  let text = "";
  let artifact = null;

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (isArtifactToolUse(block)) {
      artifact = block.input as { title: string; content: string };
    }
  }

  return NextResponse.json({ text, artifact });
}
```

### 7. Wiring into VideoSum (`components/mvp/NotesViewer.tsx`)

```typescript
// Add to imports
import { ChatWithArtifacts } from '@/components/ai-artifacts/ChatWithArtifacts';
import { createFileStorage } from '@/lib/ai-artifacts/file-storage';

// Create storage instance (once, at module level or via useMemo)
const storage = createFileStorage(
  process.env.CLASS_NOTES_DIR || `${process.env.HOME}/ClassNotes`
);

// In the component, replace existing chat panel with:
<ChatWithArtifacts
  contextId={id}
  context={transcriptHtml}  // or summaryMarkdown
  storage={storage}
  onArtifactCreated={(artifact) => {
    console.log('Artifact created:', artifact.title);
  }}
/>
```

---

## Files to Create

| File                                            | Purpose           | LOC  |
| ----------------------------------------------- | ----------------- | ---- |
| `lib/ai-artifacts/types.ts`                     | Core types        | ~15  |
| `lib/ai-artifacts/storage.ts`                   | Storage interface | ~10  |
| `lib/ai-artifacts/file-storage.ts`              | File system impl  | ~50  |
| `lib/ai-artifacts/tool-calling.ts`              | Claude tool def   | ~30  |
| `lib/ai-artifacts/index.ts`                     | Public exports    | ~10  |
| `components/ai-artifacts/ChatWithArtifacts.tsx` | Main component    | ~150 |
| `components/ai-artifacts/ArtifactCard.tsx`      | Artifact display  | ~60  |
| `app/api/ai-artifacts/chat/route.ts`            | Chat endpoint     | ~40  |

**Total: ~365 LOC** (down from ~800+ in original plan)

## Files to Modify

| File                             | Changes                                     |
| -------------------------------- | ------------------------------------------- |
| `components/mvp/NotesViewer.tsx` | Replace chat panel with `ChatWithArtifacts` |

---

## Acceptance Criteria

### Core Functionality

- [ ] User can chat with Claude about the video context
- [ ] User can request artifacts via natural language ("create a summary")
- [ ] Claude uses tool calling to create artifacts (no regex parsing)
- [ ] Artifacts are auto-saved to `artifacts.json`
- [ ] Artifacts display inline in chat sidebar
- [ ] User can delete artifacts
- [ ] User can download artifacts as markdown

### Reusability

- [ ] `lib/ai-artifacts/` has no dependencies on "class notes" domain
- [ ] Storage interface allows different implementations
- [ ] Components accept storage via props (dependency injection)
- [ ] Can be copy-pasted to another project with minimal changes

### Quality

- [ ] TypeScript strict mode passes
- [ ] No new dependencies added (uses existing Anthropic SDK)
- [ ] Unit tests for storage and tool-calling utilities

---

## What Was Removed (vs Original Plan)

| Removed                    | Reason                             |
| -------------------------- | ---------------------------------- |
| Vercel AI SDK migration    | Unnecessary - existing SDK works   |
| Regex artifact parsing     | Fragile - use tool calling instead |
| Four artifact types        | YAGNI - one generic type for MVP   |
| Mobile responsive code     | Desktop only (Mac app)             |
| Cost tracking              | Defer to v1.1                      |
| Confirmation dialogs       | Auto-save is simpler               |
| Separate ArtifactsTab      | Show inline in chat                |
| Three-phase implementation | Single implementation              |

---

## Future: Extracting to NPM Package

When you need this in project #2:

```bash
# Create package
mkdir packages/ai-artifacts
mv lib/ai-artifacts/* packages/ai-artifacts/src/
mv components/ai-artifacts/* packages/ai-artifacts/src/components/

# Add package.json
{
  "name": "@your-org/ai-artifacts",
  "main": "src/index.ts",
  "peerDependencies": {
    "react": "^18 || ^19",
    "@anthropic-ai/sdk": "^0.70"
  }
}
```

Then in any project:

```typescript
import { ChatWithArtifacts, createFileStorage } from "@your-org/ai-artifacts";
```

---

## References

### Internal

- Existing chat: `app/api/class-notes/[id]/chat/route.ts`
- Tab system: `components/mvp/NotesViewer.tsx:55,211-288`

### External

- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/tool-use)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)
