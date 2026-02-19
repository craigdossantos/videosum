"use client";

import React, { useRef, useState } from "react";
import { FileVideoIcon } from "./Icons";

interface CompactUploadBarProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

const CompactUploadBar: React.FC<CompactUploadBarProps> = ({
  onFilesSelect,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("video/"),
    );
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    onFilesSelect(Array.from(e.target.files));
    // Reset input so same files can be selected again
    e.target.value = "";
  };

  const handleChooseFiles = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      data-testid="compact-upload-bar"
      className={`flex items-center gap-3 px-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
        disabled
          ? "h-12 border-gray-200 bg-gray-50 cursor-not-allowed"
          : dragActive
            ? "h-20 border-blue-500 bg-blue-50"
            : "h-12 border-gray-300 bg-white hover:border-gray-400"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <FileVideoIcon
        className={`w-5 h-5 flex-shrink-0 ${
          disabled ? "text-gray-400" : "text-gray-500"
        }`}
      />

      <span
        className={`text-sm ${disabled ? "text-gray-400" : "text-gray-600"}`}
      >
        Drop videos here or
      </span>

      <button
        type="button"
        onClick={handleChooseFiles}
        disabled={disabled}
        className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
          disabled
            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
            : "text-blue-600 bg-blue-50 hover:bg-blue-100"
        }`}
      >
        Choose files
      </button>

      <span className="text-xs text-gray-400">MP4, MOV, WebM, AVI</span>

      <input
        id="compact-file-upload"
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="video/*"
        multiple
        disabled={disabled}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default CompactUploadBar;
