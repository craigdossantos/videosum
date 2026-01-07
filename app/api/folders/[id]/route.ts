import { NextRequest, NextResponse } from 'next/server';
import {
  getFolder,
  updateFolder,
  deleteFolder,
  getFolderContent,
  reorderVideosInFolder,
} from '@/lib/folders';

/**
 * GET /api/folders/[id] - Get folder details with content
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const folder = await getFolder(id);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const content = await getFolderContent(id);

    return NextResponse.json({
      ...folder,
      overview: content.overview,
      combinedBlog: content.combinedBlog,
    });
  } catch (error) {
    console.error('Failed to get folder:', error);
    return NextResponse.json(
      { error: 'Failed to get folder' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/folders/[id] - Update folder name, description, or video order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, videoIds } = body;

    // Handle video reordering
    if (videoIds && Array.isArray(videoIds)) {
      const success = await reorderVideosInFolder(id, videoIds);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to reorder videos' },
          { status: 400 }
        );
      }
    }

    // Handle name/description update
    if (name !== undefined || description !== undefined) {
      const folder = await updateFolder(id, { name, description });
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
      return NextResponse.json(folder);
    }

    // If only reordering, return the folder
    const folder = await getFolder(id);
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to update folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[id] - Delete a folder
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteFolder(id);

    if (!success) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
