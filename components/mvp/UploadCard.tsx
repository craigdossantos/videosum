'use client';

import React, { useState } from 'react';
import { UploadIcon } from './Icons';

interface UploadCardProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const UploadCard: React.FC<UploadCardProps> = ({ onFileSelect, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Video</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload')?.click()}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
        }`}>
          <UploadIcon className="w-7 h-7" />
        </div>
        <p className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {disabled ? 'Processing...' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-500 mt-1">MP4, MOV, WebM, AVI (max 2GB)</p>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="video/*"
          disabled={disabled}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default UploadCard;
