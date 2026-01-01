import { NextRequest, NextResponse } from "next/server";
import {
  createFileStorage,
  type CreateArtifactInput,
} from "@/lib/ai-artifacts";
import { getNotesDirectory } from "@/lib/settings";

// Create storage lazily to use current settings
async function getStorage() {
  const notesDir = await getNotesDirectory();
  return createFileStorage(notesDir);
}

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
    const decodedId = decodeURIComponent(contextId);
    const storage = await getStorage();
    const artifacts = await storage.list(decodedId);
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
    const decodedId = decodeURIComponent(contextId);
    const body: CreateArtifactInput = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    const storage = await getStorage();
    const artifact = await storage.save(decodedId, body);
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
    const decodedId = decodeURIComponent(contextId);
    const { searchParams } = new URL(request.url);
    const artifactId = searchParams.get("id");

    if (!artifactId) {
      return NextResponse.json(
        { error: "Artifact ID is required" },
        { status: 400 },
      );
    }

    const storage = await getStorage();
    await storage.delete(decodedId, artifactId);
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
