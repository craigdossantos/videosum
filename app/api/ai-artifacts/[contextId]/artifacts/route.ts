import { NextRequest, NextResponse } from "next/server";
import { homedir } from "os";
import {
  createFileStorage,
  type CreateArtifactInput,
} from "@/lib/ai-artifacts";

function getOutputDir(): string {
  const configDir = process.env.CLASS_NOTES_DIR || "~/ClassNotes";
  return configDir.replace(/^~/, homedir());
}

// Create storage instance
const storage = createFileStorage(getOutputDir());

/**
 * GET /api/ai-artifacts/[contextId]/artifacts
 * List all artifacts for a context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  try {
    const { contextId } = await params;
    const artifacts = await storage.list(contextId);
    return NextResponse.json({ artifacts });
  } catch (error) {
    console.error("Error listing artifacts:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list artifacts",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai-artifacts/[contextId]/artifacts
 * Create a new artifact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  try {
    const { contextId } = await params;
    const body: CreateArtifactInput = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    const artifact = await storage.save(contextId, body);
    return NextResponse.json({ artifact }, { status: 201 });
  } catch (error) {
    console.error("Error creating artifact:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create artifact",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai-artifacts/[contextId]/artifacts?id=xxx
 * Delete an artifact by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contextId: string }> },
) {
  try {
    const { contextId } = await params;
    const { searchParams } = new URL(request.url);
    const artifactId = searchParams.get("id");

    if (!artifactId) {
      return NextResponse.json(
        { error: "Artifact ID is required" },
        { status: 400 },
      );
    }

    await storage.delete(contextId, artifactId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artifact:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete artifact",
      },
      { status: 500 },
    );
  }
}
