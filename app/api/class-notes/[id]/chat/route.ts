import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import Anthropic from '@anthropic-ai/sdk';

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || '~/ClassNotes';
  return configDir.replace(/^~/, homedir());
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message, history = [] }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Load notes
    const outputDir = getOutputDir();
    const classDir = join(outputDir, id);

    // Check if directory exists
    try {
      await access(classDir);
    } catch {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const markdown = await readFile(join(classDir, 'notes.md'), 'utf-8');

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a helpful assistant discussing a class the user attended.

Here are the complete notes from the class:

${markdown}

Help the user:
- Understand concepts from the class
- Clarify any points they're confused about
- Create quizzes to test their understanding
- Explain how to do the exercises
- Connect ideas across different parts of the class

Be conversational and helpful. Reference specific parts of the notes when relevant.`,
      messages: [
        ...history.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: message },
      ],
    });

    // Extract text content from response
    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ message: responseText });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
