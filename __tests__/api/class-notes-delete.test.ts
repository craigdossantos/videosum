import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so these are available in vi.mock factories (which are hoisted)
const {
  mockRm,
  mockReadFile,
  mockWriteFile,
  mockMkdir,
  mockAccess,
  mockRemoveFromAll,
} = vi.hoisted(() => ({
  mockRm: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockAccess: vi.fn(),
  mockRemoveFromAll: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    rm: mockRm,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
    access: mockAccess,
  },
  rm: mockRm,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  access: mockAccess,
}));

vi.mock("@/lib/settings", () => ({
  getNotesDirectory: vi.fn().mockResolvedValue("/mock/notes"),
}));

vi.mock("@/lib/folders", () => ({
  removeVideoFromAllFolders: mockRemoveFromAll,
}));

import { DELETE } from "@/app/api/class-notes/[id]/route";
import { NextRequest } from "next/server";

function createDeleteRequest(url: string): NextRequest {
  return new Request(url, { method: "DELETE" }) as unknown as NextRequest;
}

describe("DELETE /api/class-notes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRm.mockResolvedValue(undefined);
    mockRemoveFromAll.mockResolvedValue(undefined);
  });

  it("removes folder from disk, cleans folders.json, returns success", async () => {
    const params = Promise.resolve({ id: "my-video" });
    const response = await DELETE(
      createDeleteRequest("http://localhost/api/class-notes/my-video"),
      { params },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockRemoveFromAll).toHaveBeenCalledWith("my-video");
    expect(mockRm).toHaveBeenCalledWith("/mock/notes/my-video", {
      recursive: true,
      force: true,
    });
  });

  it("removes URL-encoded ID from folders and disk", async () => {
    const encodedId = encodeURIComponent(
      "School/Math 101/2025-12-30 - Lecture",
    );
    const params = Promise.resolve({ id: encodedId });
    const response = await DELETE(
      createDeleteRequest(`http://localhost/api/class-notes/${encodedId}`),
      { params },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockRemoveFromAll).toHaveBeenCalledWith(
      "School/Math 101/2025-12-30 - Lecture",
    );
    expect(mockRm).toHaveBeenCalledWith(
      "/mock/notes/School/Math 101/2025-12-30 - Lecture",
      { recursive: true, force: true },
    );
  });

  it("still cleans folders.json when folder is already gone (not 404)", async () => {
    const params = Promise.resolve({ id: "already-trashed" });
    const response = await DELETE(
      createDeleteRequest("http://localhost/api/class-notes/already-trashed"),
      { params },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockRemoveFromAll).toHaveBeenCalledWith("already-trashed");
  });

  it("succeeds when ID is not in any folder", async () => {
    const params = Promise.resolve({ id: "not-in-folders" });
    const response = await DELETE(
      createDeleteRequest("http://localhost/api/class-notes/not-in-folders"),
      { params },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockRemoveFromAll).toHaveBeenCalledWith("not-in-folders");
  });

  it("rejects path traversal attempts", async () => {
    const req = new Request("http://localhost/api/class-notes/..%2F..%2Fetc", {
      method: "DELETE",
    });
    const response = await DELETE(req, {
      params: Promise.resolve({ id: "..%2F..%2Fetc" }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid ID");
  });

  it("DELETE with valid ID that is in 2 folders removes from both", async () => {
    const params = Promise.resolve({ id: "multi-folder-video" });
    const response = await DELETE(
      createDeleteRequest(
        "http://localhost/api/class-notes/multi-folder-video",
      ),
      { params },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockRemoveFromAll).toHaveBeenCalledWith("multi-folder-video");
    expect(mockRm).toHaveBeenCalledWith("/mock/notes/multi-folder-video", {
      recursive: true,
      force: true,
    });
  });
});

describe("removeVideoFromAllFolders (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  async function loadRealFunction() {
    const mockRead = vi.fn();
    const mockWrite = vi.fn().mockResolvedValue(undefined);

    const fsMock = {
      readFile: mockRead,
      writeFile: mockWrite,
      mkdir: vi.fn().mockResolvedValue(undefined),
    };
    vi.doMock("fs/promises", () => ({
      ...fsMock,
      default: fsMock,
    }));
    vi.doMock("os", () => ({
      default: { homedir: vi.fn().mockReturnValue("/mock/home") },
      homedir: vi.fn().mockReturnValue("/mock/home"),
    }));

    // Remove the module-level vi.mock for @/lib/folders to get the real implementation
    vi.doUnmock("@/lib/folders");

    const foldersMod = await import("@/lib/folders");
    return {
      removeVideoFromAllFolders: foldersMod.removeVideoFromAllFolders,
      mockRead,
      mockWrite,
    };
  }

  it("removes video from both folders A and B, leaves others untouched", async () => {
    const { removeVideoFromAllFolders, mockRead, mockWrite } =
      await loadRealFunction();

    const foldersData = {
      folders: [
        {
          id: "folder-a",
          name: "A",
          createdAt: "2024-01-01",
          videoIds: ["video-1", "video-2"],
        },
        {
          id: "folder-b",
          name: "B",
          createdAt: "2024-01-01",
          videoIds: ["video-1", "video-3"],
        },
        {
          id: "folder-c",
          name: "C",
          createdAt: "2024-01-01",
          videoIds: ["video-4"],
        },
      ],
    };

    mockRead.mockResolvedValue(JSON.stringify(foldersData));

    await removeVideoFromAllFolders("video-1");

    expect(mockWrite).toHaveBeenCalledOnce();
    const savedData = JSON.parse(mockWrite.mock.calls[0][1] as string);
    expect(savedData.folders[0].videoIds).toEqual(["video-2"]);
    expect(savedData.folders[1].videoIds).toEqual(["video-3"]);
    expect(savedData.folders[2].videoIds).toEqual(["video-4"]);
  });

  it("succeeds when folders.json is absent (no-op, no error)", async () => {
    const { removeVideoFromAllFolders, mockRead, mockWrite } =
      await loadRealFunction();

    mockRead.mockRejectedValue(new Error("ENOENT"));

    await expect(removeVideoFromAllFolders("video-1")).resolves.toBeUndefined();
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
