/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArtifactCard } from "../ArtifactCard";
import type { Artifact } from "@/lib/ai-artifacts";

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("ArtifactCard", () => {
  const mockArtifact: Artifact = {
    id: "art_123",
    title: "Test Artifact",
    content: "# Test Content\n\nThis is test markdown.",
    createdAt: "2024-01-15T10:30:00Z",
    prompt: "Create a test artifact",
  };

  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("compact mode", () => {
    it("should render title in compact mode", () => {
      render(
        <ArtifactCard
          artifact={mockArtifact}
          onDelete={mockOnDelete}
          compact
        />,
      );

      expect(screen.getByText("Test Artifact")).toBeInTheDocument();
    });

    it("should call onDelete when delete button is clicked", () => {
      render(
        <ArtifactCard
          artifact={mockArtifact}
          onDelete={mockOnDelete}
          compact
        />,
      );

      const deleteButton = screen.getByTitle("Delete");
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("should have download button in compact mode", () => {
      render(
        <ArtifactCard
          artifact={mockArtifact}
          onDelete={mockOnDelete}
          compact
        />,
      );

      expect(screen.getByTitle("Download")).toBeInTheDocument();
    });
  });

  describe("full mode", () => {
    it("should render title and date in full mode", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      expect(screen.getByText("Test Artifact")).toBeInTheDocument();
      // Date format depends on locale, so check for the date parts
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it("should be collapsed by default", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      // Content should not be visible initially
      expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
    });

    it("should expand when clicked", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      // Find and click the expand button (last button in the header)
      const buttons = screen.getAllByRole("button");
      const expandButton = buttons[buttons.length - 1];
      fireEvent.click(expandButton);

      // Content should now be visible after expanding
      expect(screen.getByText(/Test Content/)).toBeInTheDocument();
    });

    it("should show prompt when expanded and prompt exists", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      // Expand
      const buttons = screen.getAllByRole("button");
      const expandButton = buttons[buttons.length - 1];
      fireEvent.click(expandButton);

      expect(screen.getByText(/Create a test artifact/)).toBeInTheDocument();
    });

    it("should have download button with correct title", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      expect(screen.getByTitle("Download as Markdown")).toBeInTheDocument();
    });

    it("should have delete button with correct title", () => {
      render(<ArtifactCard artifact={mockArtifact} onDelete={mockOnDelete} />);

      expect(screen.getByTitle("Delete artifact")).toBeInTheDocument();
    });
  });

  describe("download functionality", () => {
    it("should create blob and trigger download", () => {
      const mockClick = vi.fn();

      // Store original createElement
      const originalCreateElement = document.createElement.bind(document);

      // Mock only anchor elements
      vi.spyOn(document, "createElement").mockImplementation((tag) => {
        if (tag === "a") {
          return {
            href: "",
            download: "",
            click: mockClick,
            setAttribute: vi.fn(),
            style: {},
          } as unknown as HTMLElement;
        }
        return originalCreateElement(tag);
      });

      render(
        <ArtifactCard
          artifact={mockArtifact}
          onDelete={mockOnDelete}
          compact
        />,
      );

      const downloadButton = screen.getByTitle("Download");
      fireEvent.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();

      // Restore
      vi.restoreAllMocks();
    });
  });
});
