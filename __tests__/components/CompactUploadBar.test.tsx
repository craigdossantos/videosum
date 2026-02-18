import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompactUploadBar from "@/components/mvp/CompactUploadBar";

describe("CompactUploadBar", () => {
  let mockOnFilesSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFilesSelect = vi.fn();
  });

  describe("Rendering", () => {
    it("renders with 'Choose files' button and format hint", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      expect(screen.getByText("Choose files")).toBeInTheDocument();
      expect(screen.getByText("MP4, MOV, WebM, AVI")).toBeInTheDocument();
    });

    it("renders drop hint text", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      expect(screen.getByText(/Drop videos here or/)).toBeInTheDocument();
    });
  });

  describe("File Selection", () => {
    it("clicking 'Choose files' triggers file input click", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const fileInput = document.getElementById(
        "compact-file-upload",
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      const button = screen.getByText("Choose files");
      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("selecting files calls onFilesSelect with File array", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const fileInput = document.getElementById(
        "compact-file-upload",
      ) as HTMLInputElement;
      const videoFile = new File(["video"], "test.mp4", {
        type: "video/mp4",
      });

      Object.defineProperty(fileInput, "files", {
        value: [videoFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(mockOnFilesSelect).toHaveBeenCalledWith([videoFile]);
    });
  });

  describe("Drag and Drop", () => {
    it("drag over adds visual expansion CSS class", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      fireEvent.dragEnter(dropZone!);

      expect(dropZone).toHaveClass("h-20");
      expect(dropZone).toHaveClass("border-blue-500");
      expect(dropZone).toHaveClass("bg-blue-50");
    });

    it("drag leave removes expansion", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      fireEvent.dragEnter(dropZone!);
      fireEvent.dragLeave(dropZone!);

      expect(dropZone).toHaveClass("h-12");
      expect(dropZone).not.toHaveClass("bg-blue-50");
    });

    it("dropping video files calls onFilesSelect", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      const videoFile = new File(["video content"], "test.mp4", {
        type: "video/mp4",
      });

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [videoFile] },
      });

      expect(mockOnFilesSelect).toHaveBeenCalledWith([videoFile]);
    });

    it("drop non-video files does not call onFilesSelect", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      const textFile = new File(["text"], "doc.txt", {
        type: "text/plain",
      });

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [textFile] },
      });

      expect(mockOnFilesSelect).not.toHaveBeenCalled();
    });

    it("drop mixed files only passes video files", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      const videoFile = new File(["video"], "test.mp4", {
        type: "video/mp4",
      });
      const textFile = new File(["text"], "doc.txt", {
        type: "text/plain",
      });

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [videoFile, textFile] },
      });

      expect(mockOnFilesSelect).toHaveBeenCalledWith([videoFile]);
    });
  });

  describe("Disabled State", () => {
    it("disabled={true} renders button as disabled", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} disabled />);

      const button = screen.getByText("Choose files");
      expect(button).toBeDisabled();
    });

    it("disabled={true} ignores drag events", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} disabled />);

      const dropZone = screen
        .getByText(/Drop videos here or/)
        .closest("[data-testid='compact-upload-bar']");

      // Drag should not cause expansion
      fireEvent.dragEnter(dropZone!);
      expect(dropZone).not.toHaveClass("bg-blue-50");

      // Drop should not call handler
      const videoFile = new File(["video"], "test.mp4", {
        type: "video/mp4",
      });

      fireEvent.drop(dropZone!, {
        dataTransfer: { files: [videoFile] },
      });

      expect(mockOnFilesSelect).not.toHaveBeenCalled();
    });

    it("disabled={true} file input is disabled", () => {
      render(<CompactUploadBar onFilesSelect={mockOnFilesSelect} disabled />);

      const fileInput = document.getElementById(
        "compact-file-upload",
      ) as HTMLInputElement;
      expect(fileInput.disabled).toBe(true);
    });
  });
});
