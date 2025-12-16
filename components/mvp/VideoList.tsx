import React from 'react';
import { VideoRecord, VideoStatus, SourceType } from '@/lib/mvp/types';
import { CheckCircleIcon, LoaderIcon, ZoomIcon, FileVideoIcon } from './Icons';

interface VideoListProps {
  videos: VideoRecord[];
  onSelect: (video: VideoRecord) => void;
}

const VideoList: React.FC<VideoListProps> = ({ videos, onSelect }) => {
  if (videos.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Recordings</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {videos.map((video) => (
          <div 
            key={video.id} 
            onClick={() => video.status === VideoStatus.COMPLETED && onSelect(video)}
            className={`p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${video.status === VideoStatus.COMPLETED ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {/* Thumbnail / Icon */}
            <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
                {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FileVideoIcon className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 rounded">
                    {video.duration}
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-semibold text-gray-900 truncate">{video.title}</h4>
                    {video.sourceType === SourceType.ZOOM && <ZoomIcon className="w-4 h-4 text-blue-500" />}
                </div>
                <p className="text-sm text-gray-500">{video.date}</p>
            </div>

            {/* Status */}
            <div className="flex-shrink-0 px-4">
                {video.status === VideoStatus.COMPLETED ? (
                    <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Ready</span>
                    </div>
                ) : video.status === VideoStatus.PROCESSING ? (
                    <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium animate-pulse">
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        <span>AI Processing...</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">Pending</span>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoList;