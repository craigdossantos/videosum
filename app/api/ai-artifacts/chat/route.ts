import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CREATE_ARTIFACT_TOOL, isArtifactToolUse } from "@/lib/ai-artifacts";

const client = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt }: ChatRequest = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 },
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: [CREATE_ARTIFACT_TOOL],
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
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
  } catch (error) {
    console.error("AI Artifacts chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
