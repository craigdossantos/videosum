'use client';

import React, { useState, useCallback } from 'react';
import { INITIAL_VIDEOS, MOCK_TRANSCRIPT } from '@/lib/mvp/constants';
import { VideoRecord, VideoStatus, SourceType } from '@/lib/mvp/types';
import UploadCard from '@/components/mvp/UploadCard';
import VideoList from '@/components/mvp/VideoList';
import SummaryView from '@/components/mvp/SummaryView';
import { generateMeetingSummary, analyzeVideo } from '@/lib/mvp/geminiService';

export default function DemoPage() {
  const [videos, setVideos] = useState<VideoRecord[]>(INITIAL_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File | null, url: string | null, type: SourceType) => {
    const newId = Math.random().toString(36).substring(7);
    const title = file ? file.name.replace(/\.[^/.]+$/, "") : `Meeting from ${type}`;

    // Create a local URL for the file so the browser can play it immediately
    // This simulates how a backend would return a cloud storage URL
    const fileUrl = file ? URL.createObjectURL(file) : undefined;

    // 1. Create Pending Record
    const newVideo: VideoRecord = {
      id: newId,
      title: title,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: "00:00",
      status: VideoStatus.PROCESSING,
      sourceType: type,
      thumbnailUrl: 'https://picsum.photos/300/170?grayscale', // Placeholder
      fileUrl: fileUrl, // Store the local URL
    };

    setVideos(prev => [newVideo, ...prev]);
    setProcessingId(newId);

    // 2. Process with Gemini API
    try {
        let resultSummary;
        let resultTimeline;

        if (file) {
            // Use Gemini to analyze the video file
            const analysis = await analyzeVideo(file);
            resultSummary = analysis.summary;
            resultTimeline = analysis.timeline;
        } else {
             // Simulate Backend Processing for URLs
             // In your local dev environment, this is where you'd POST to your API
             await new Promise(resolve => setTimeout(resolve, 2000));
             resultSummary = await generateMeetingSummary(MOCK_TRANSCRIPT);
             resultTimeline = [
                { timestamp: "00:05", description: "Introduction", isSlide: false, imageUrl: `https://picsum.photos/seed/${newId}1/400/225` },
                { timestamp: "00:15", description: "Key Discussion", isSlide: true, imageUrl: `https://picsum.photos/seed/${newId}2/400/225` },
             ];
        }

        setVideos(prev => prev.map(v => {
            if (v.id === newId) {
                return {
                    ...v,
                    status: VideoStatus.COMPLETED,
                    duration: "10:25", // Mocked duration
                    thumbnailUrl: `https://picsum.photos/seed/${newId}/300/170`,
                    summary: resultSummary,
                    timeline: resultTimeline
                };
            }
            return v;
        }));
    } catch (error) {
        console.error("Processing failed", error);
        setVideos(prev => prev.map(v => {
            if (v.id === newId) {
                return { ...v, status: VideoStatus.FAILED };
            }
            return v;
        }));
    } finally {
        setProcessingId(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedVideo(null)}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">V</div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">VideoSum</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-gray-500">
                Client-Side MVP Demo
             </div>
             <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedVideo ? (
          <SummaryView
            video={selectedVideo}
            onBack={() => setSelectedVideo(null)}
          />
        ) : (
          <div className="space-y-8 animate-fade-in">
             <div className="text-center py-12">
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Turn Video into Action</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    The modern meeting recorder. Upload a video to see the
                    <span className="font-semibold text-primary-600"> timeline and playback </span>
                    functionality in action.
                </p>
             </div>

            <UploadCard onUploadStart={handleUpload} />

            <VideoList
              videos={videos}
              onSelect={setSelectedVideo}
            />
          </div>
        )}
      </main>
    </div>
  );
}
