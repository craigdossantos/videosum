import React, { useState } from 'react';
import { UploadIcon, FileVideoIcon } from './Icons';
import { SourceType } from '@/lib/mvp/types';

interface UploadCardProps {
  onUploadStart: (file: File | null, url: string | null, type: SourceType) => void;
}

const UploadCard: React.FC<UploadCardProps> = ({ onUploadStart }) => {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadStart(e.dataTransfer.files[0], null, SourceType.UPLOAD);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      let type = SourceType.UPLOAD;
      if (urlInput.includes('zoom.us')) type = SourceType.ZOOM;
      else if (urlInput.includes('youtube.com')) type = SourceType.YOUTUBE;
      else if (urlInput.includes('meet.google.com')) type = SourceType.MEET;
      
      onUploadStart(null, urlInput, type);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Meeting Recording</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Drag Drop Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-3">
            <UploadIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">MP4, MOV, MKV (max 2GB)</p>
          <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            accept="video/*" 
            onChange={(e) => e.target.files?.[0] && onUploadStart(e.target.files[0], null, SourceType.UPLOAD)}
          />
        </div>

        {/* URL Input Area */}
        <div className="flex flex-col justify-center">
            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Import from URL</label>
                <div className="text-xs text-gray-500 mb-3">Supports Zoom, YouTube, Google Meet</div>
                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                    <input 
                    type="url" 
                    placeholder="Paste meeting link..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <button 
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                    Import
                    </button>
                </form>
            </div>
            <div className="flex items-center gap-4 text-gray-400">
                 <div className="flex items-center gap-1">
                    <FileVideoIcon className="w-4 h-4" />
                    <span className="text-xs">Zoom</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <FileVideoIcon className="w-4 h-4" />
                    <span className="text-xs">YouTube</span>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UploadCard;