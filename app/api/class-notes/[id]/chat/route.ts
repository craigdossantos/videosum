import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import Anthropic from "@anthropic-ai/sdk";

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || "~/ClassNotes";
  return configDir.replace(/^~/, homedir());
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { message, history = [] }: ChatRequest = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Load notes
    const outputDir = getOutputDir();
    const classDir = join(outputDir, id);

    // Check if directory exists
    try {
      await access(classDir);
    } catch {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Load transcript and notes
    let transcript: string;
    let notes: string;

    try {
      transcript = await readFile(join(classDir, "transcript.txt"), "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 },
      );
    }

    try {
      notes = await readFile(join(classDir, "notes.md"), "utf-8");
    } catch {
      notes = ""; // Notes are optional
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are the instructor from this class, answering questions about what you taught. Respond in first person as if you're the teacher who gave this lesson.

## Transcript of Your Class
${transcript}

${notes ? `## Your Class Notes\n${notes}` : ""}

When students ask questions:
- Reference "when I explained..." or "what I meant was..." or "in my class, I covered..."
- Draw from the transcript of YOUR teaching
- Be warm and encouraging, as you would with your students
- If a student seems confused, offer to clarify what you taught
- Create practice exercises or quizzes when helpful
- Quote directly from your teaching when relevant

If something wasn't covered in your class, acknowledge that and offer what guidance you can based on what you did teach.`,
      messages: [
        ...history.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user" as const, content: message },
      ],
    });

    // Extract text content from response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ message: responseText });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
