import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LibraryView from "@/components/mvp/LibraryView";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn();

describe("LibraryView", () => {
  let mockOnSelectVideo: ReturnType<typeof vi.fn>;
  let mockOnSelectFolder: ReturnType<typeof vi.fn>;
  let mockOnBack: ReturnType<typeof vi.fn>;

  const mockVideos = [
    {
      id: "video-1",
      title: "Test Video 1",
      source_file: "test1.mp4",
      source_hash: "abc123",
      duration_seconds: 3661, // 1:01:01
      processed_at: "2024-01-15T10:30:00Z",
      costs: { transcription: 0.1, summarization: 0.05, total: 0.15 },
    },
    {
      id: "video-2",
      title: "Test Video 2",
      source_file: "test2.mp4",
      source_hash: "def456",
      duration_seconds: 125, // 2:05
      processed_at: "2024-01-16T14:00:00Z",
      costs: { transcription: 0.08, summarization: 0.04, total: 0.12 },
    },
  ];

  const mockFolders = [
    {
      id: "folder-1",
      name: "Course Materials",
      createdAt: "2024-01-10T00:00:00Z",
      videoIds: [],
      videoCount: 0,
    },
    {
      id: "folder-2",
      name: "Lectures",
      createdAt: "2024-01-11T00:00:00Z",
      videoIds: ["video-1"],
      videoCount: 1,
      hasOverview: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSelectVideo = vi.fn();
    mockOnSelectFolder = vi.fn();
    mockOnBack = vi.fn();
    // Clean up electronAPI in case a previous test set it
    delete (window as unknown as Record<string, unknown>).electronAPI;
  });

  function mockSuccessfulFetch() {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideos),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFolders),
      });
  }

  describe("Loading State", () => {
    it("shows loading spinner initially", () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      expect(screen.getByText("Loading library...")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error message when videos fetch fails", async () => {
      // Both fetches happen in parallel, need to mock both
      mockFetch
        .mockResolvedValueOnce({ ok: false }) // videos fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }); // folders succeeds

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Failed to load videos")).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Try again")).toBeInTheDocument();
      });
    });

    it("refetches data when retry clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false }) // Initial videos fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) // Initial folders
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }) // Retry videos
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        }); // Retry folders

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Try again")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Try again"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4); // Initial 2 + retry 2
      });
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no videos", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("No videos processed yet")).toBeInTheDocument();
      });
    });

    it("shows upload link in empty state", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        const uploadLink = screen.getByText("Upload your first video");
        expect(uploadLink).toBeInTheDocument();

        fireEvent.click(uploadLink);
        expect(mockOnBack).toHaveBeenCalled();
      });
    });
  });

  describe("Folders Display", () => {
    it("displays folders with video count", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Folders (2)")).toBeInTheDocument();
        expect(screen.getByText("Course Materials")).toBeInTheDocument();
        expect(screen.getByText("0 videos")).toBeInTheDocument();
        expect(screen.getByText("Lectures")).toBeInTheDocument();
        expect(screen.getByText(/1 video/)).toBeInTheDocument();
      });
    });

    it("shows summary indicator for folders with overview", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/Has summary/)).toBeInTheDocument();
      });
    });

    it("calls onSelectFolder when folder clicked", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Course Materials")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Course Materials"));
      expect(mockOnSelectFolder).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("Videos Display", () => {
    it("shows uncategorized videos", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        // video-1 is in folder-2, so only video-2 should be uncategorized
        expect(screen.getByText("Uncategorized (1)")).toBeInTheDocument();
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });
    });

    it("displays video duration formatted correctly", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("2:05")).toBeInTheDocument(); // 125 seconds
      });
    });

    it("calls onSelectVideo when video clicked", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Video 2"));
      expect(mockOnSelectVideo).toHaveBeenCalledWith("video-2");
    });
  });

  describe("Header Actions", () => {
    it("calls onBack when back button clicked", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Video Library")).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText("Go back");
      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalled();
    });

    it("shows New Folder button", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("New Folder")).toBeInTheDocument();
      });
    });
  });

  describe("Create Folder", () => {
    it("shows create folder form when New Folder clicked", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("New Folder")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Folder"));

      expect(screen.getByText("Create New Folder")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Folder name...")).toBeInTheDocument();
    });

    it("creates folder when form submitted", async () => {
      mockSuccessfulFetch();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "new-folder",
            name: "My New Folder",
            videoIds: [],
          }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("New Folder")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Folder"));

      const input = screen.getByPlaceholderText("Folder name...");
      fireEvent.change(input, { target: { value: "My New Folder" } });
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/folders",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "My New Folder" }),
          }),
        );
      });
    });

    it("hides form when Cancel clicked", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("New Folder")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("New Folder"));
      expect(screen.getByText("Create New Folder")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Create New Folder")).not.toBeInTheDocument();
    });
  });

  describe("Add Video to Folder", () => {
    it("shows add to folder dropdown for uncategorized videos", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      // Find the add to folder button (plus icon)
      const addButton = screen.getByTitle("Add to folder");
      fireEvent.click(addButton);

      await waitFor(() => {
        // The dropdown text has "uppercase" CSS class so match case-insensitive
        expect(screen.getByText(/add to folder/i)).toBeInTheDocument();
      });
      // Folder names should appear in dropdown - there will be duplicates from the main list
      expect(screen.getAllByText("Course Materials").length).toBeGreaterThan(1);
      expect(screen.getAllByText("Lectures").length).toBeGreaterThan(1);
    });

    it("adds video to folder when folder selected from dropdown", async () => {
      mockSuccessfulFetch();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      // Open dropdown
      const addButton = screen.getByTitle("Add to folder");
      fireEvent.click(addButton);

      // Select a folder (find the one in the dropdown, not the main list)
      await waitFor(() => {
        const dropdownButtons = screen.getAllByText("Course Materials");
        const dropdownOption = dropdownButtons[dropdownButtons.length - 1];
        fireEvent.click(dropdownOption);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/folders/folder-1/videos",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ videoId: "video-2" }),
          }),
        );
      });
    });
  });

  describe("Reprocess Video", () => {
    it("shows reprocess button for videos", async () => {
      mockSuccessfulFetch();

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      expect(screen.getByTitle("Regenerate summary")).toBeInTheDocument();
    });

    it("calls reprocess API when confirmed", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const reprocessButton = screen.getByTitle("Regenerate summary");
      fireEvent.click(reprocessButton);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/class-notes/video-2/reprocess",
          { method: "POST" },
        );
      });
    });

    it("does not call API when reprocess cancelled", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const reprocessButton = screen.getByTitle("Regenerate summary");
      fireEvent.click(reprocessButton);

      expect(global.confirm).toHaveBeenCalled();
      // Should not make another fetch beyond the initial 2
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("All Videos Organized", () => {
    it("shows message when all videos are in folders", async () => {
      const videosInFolders = [
        { ...mockVideos[0], id: "video-1" },
        { ...mockVideos[1], id: "video-3" },
      ];
      const foldersWithAllVideos = [
        {
          ...mockFolders[0],
          videoIds: ["video-1", "video-3"],
          videoCount: 2,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(videosInFolders),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(foldersWithAllVideos),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText("All videos are organized in folders."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Delete Video", () => {
    it("shows delete button for each uncategorized video", async () => {
      // Use no folders so both videos are uncategorized
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockVideos),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 1")).toBeInTheDocument();
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle("Delete video");
      expect(deleteButtons).toHaveLength(2);
    });

    it("shows confirmation dialog when delete clicked", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith(
        "Delete this video? This action cannot be undone.",
      );
    });

    it("calls DELETE API when confirmed", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/class-notes/video-2", {
          method: "DELETE",
        });
      });
    });

    it("does not call API when delete cancelled", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalled();
      // Should not make another fetch beyond the initial 2
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("removes video from list after successful delete", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText("Test Video 2")).not.toBeInTheDocument();
      });
    });

    it("shows error and keeps video when delete fails", async () => {
      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith("Failed to delete video");
      });

      // Video should still be in the list
      expect(screen.getByText("Test Video 2")).toBeInTheDocument();
    });

    it("calls electronAPI.trashItem when available", async () => {
      const mockTrashItem = vi.fn().mockResolvedValue({ success: true });
      (window as unknown as Record<string, unknown>).electronAPI = {
        trashItem: mockTrashItem,
      };

      mockSuccessfulFetch();

      (global.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video 2")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle("Delete video");
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockTrashItem).toHaveBeenCalledWith("video-2");
      });

      // Clean up
      delete (window as unknown as Record<string, unknown>).electronAPI;
    });
  });

  describe("Filename Display", () => {
    it("renders basename from full path source_file", async () => {
      const videosWithPath = [
        {
          ...mockVideos[0],
          id: "video-path",
          source_file: "/path/to/lecture.mp4",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(videosWithPath),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("lecture.mp4")).toBeInTheDocument();
      });
    });

    it("renders filename when source_file has no path", async () => {
      const videosSimple = [
        {
          ...mockVideos[0],
          id: "video-simple",
          source_file: "simple.mp4",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(videosSimple),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("simple.mp4")).toBeInTheDocument();
      });
    });

    it("renders nothing when source_file is empty", async () => {
      const videosEmpty = [
        {
          ...mockVideos[0],
          id: "video-empty",
          source_file: "",
          title: "Empty Source Video",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(videosEmpty),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Empty Source Video")).toBeInTheDocument();
      });

      // There should be no filename element rendered
      const videoRow = screen.getByText("Empty Source Video").closest("button");
      const filenameElements = videoRow?.querySelectorAll(
        ".text-xs.text-gray-400",
      );
      expect(filenameElements?.length ?? 0).toBe(0);
    });

    it("filename display does not interfere with click-to-select", async () => {
      const videosWithFile = [
        {
          ...mockVideos[0],
          id: "video-click",
          source_file: "/videos/clicktest.mp4",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(videosWithFile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      render(
        <LibraryView
          onSelectVideo={mockOnSelectVideo}
          onSelectFolder={mockOnSelectFolder}
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("clicktest.mp4")).toBeInTheDocument();
      });

      // Click the filename text itself
      fireEvent.click(screen.getByText("clicktest.mp4"));
      expect(mockOnSelectVideo).toHaveBeenCalledWith("video-click");
    });
  });
});
