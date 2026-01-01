import { NextRequest, NextResponse } from 'next/server';
import { addVideoToFolder, removeVideoFromFolder } from '@/lib/folders';

/**
 * POST /api/folders/[id]/videos - Add a video to a folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const body = await request.json();
    const { videoId } = body;

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const success = await addVideoToFolder(folderId, videoId);

    if (!success) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add video to folder:', error);
    return NextResponse.json(
      { error: 'Failed to add video to folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[id]/videos - Remove a video from a folder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: folderId } = await params;
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const success = await removeVideoFromFolder(folderId, videoId);

    if (!success) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove video from folder:', error);
    return NextResponse.json(
      { error: 'Failed to remove video from folder' },
      { status: 500 }
    );
  }
}
