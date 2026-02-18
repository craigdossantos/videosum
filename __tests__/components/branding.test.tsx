import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn();

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = vi.fn();

// Mock ChatWithArtifacts to avoid complex rendering issues in test
vi.mock("@/components/ai-artifacts", () => ({
  ChatWithArtifacts: () => <div data-testid="mock-chat">Mock Chat</div>,
}));

describe("Branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page header subtitle", () => {
    it("renders subtitle with 'Video Summarizer', not 'Class Notes'", async () => {
      // Mock the library and folders fetch calls (LibraryView fetches both)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const DemoPage = (await import("@/app/demo/page")).default;

      render(<DemoPage />);

      // The header subtitle should say "Video Summarizer" (appears in both
      // the header subtitle and the empty state heading)
      const matches = screen.getAllByText("Video Summarizer");
      expect(matches.length).toBeGreaterThanOrEqual(1);
      // Verify the header subtitle specifically (the <span> element)
      const subtitle = matches.find((el) => el.tagName === "SPAN");
      expect(subtitle).toBeDefined();
      expect(subtitle).toBeInTheDocument();
      // Should NOT contain any "Class Notes" branding
      expect(screen.queryByText(/Class Notes/i)).not.toBeInTheDocument();
    });
  });

  describe("NotesViewer chat header", () => {
    it("renders chat header with 'Ask about this video', not 'class'", async () => {
      const NotesViewer = (await import("@/components/mvp/NotesViewer"))
        .default;

      render(
        <NotesViewer
          id="test-video"
          title="Test Video"
          summaryMarkdown="# Test\nSome content"
          transcriptHtml="<p>Test transcript</p>"
          durationSeconds={120}
          processedAt="2024-01-15T10:30:00Z"
          onBack={vi.fn()}
        />,
      );

      // Open the chat panel
      const chatButton = screen.getByLabelText("Open chat");
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText("Ask about this video")).toBeInTheDocument();
      });
      expect(screen.queryByText(/about this class/i)).not.toBeInTheDocument();
    });
  });
});
