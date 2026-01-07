import { NextRequest, NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/folders';

/**
 * GET /api/folders - List all folders
 */
export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to get folders:', error);
    return NextResponse.json(
      { error: 'Failed to get folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folders - Create a new folder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    const folder = await createFolder(name.trim(), description?.trim());
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
