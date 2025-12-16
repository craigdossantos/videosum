import React, { useRef } from 'react';
import { VideoRecord } from '@/lib/mvp/types';
import { ChevronLeftIcon, ClockIcon } from './Icons';

interface SummaryViewProps {
  video: VideoRecord;
  onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ video, onBack }) => {
  const summary = video.summary!;
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleJumpToTime = (timestamp: string) => {
    if (!videoRef.current) return;
    const [minutes, seconds] = timestamp.split(':').map(Number);
    const timeInSeconds = minutes * 60 + seconds;
    videoRef.current.currentTime = timeInSeconds;
    videoRef.current.play();
  };

  return (
    <div className="animate-fade-in pb-12">
      <button 
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium"
      >
        <ChevronLeftIcon className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Video Player & Transcript/Timeline */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative group">
                {video.fileUrl ? (
                    <video 
                        ref={videoRef}
                        src={video.fileUrl} 
                        controls 
                        className="w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                        <p className="text-gray-400 mb-2">Video preview unavailable in demo data.</p>
                        <p className="text-xs text-gray-600">Upload a local file to test the player.</p>
                    </div>
                )}
            </div>

            {/* Timeline Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Visual Timeline</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {video.timeline?.map((event, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleJumpToTime(event.timestamp)}
                            className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex gap-4 group"
                        >
                            <div className="flex-shrink-0 w-16 font-mono text-sm text-primary-600 bg-primary-50 rounded px-2 py-1 text-center self-start group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                                {event.timestamp}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900">{event.description}</span>
                                    {event.isSlide && (
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Slide</span>
                                    )}
                                </div>
                                {event.imageUrl && (
                                    <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-gray-200 relative">
                                        <img src={event.imageUrl} alt="Frame" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Column: AI Summary & Action Items */}
        <div className="space-y-6">
             {/* Metadata Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">{video.title}</h1>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded">{video.date}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{video.duration}</span>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className={`w-2 h-2 rounded-full ${
                        summary.sentiment === 'Positive' ? 'bg-green-500' :
                        summary.sentiment === 'Concerned' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-700">{summary.sentiment} Tone</span>
                </div>
            </div>

            {/* Executive Summary */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                    {summary.executiveSummary}
                </p>
            </section>

            {/* Key Takeaways */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Highlights</h3>
                <ul className="space-y-3">
                    {summary.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="mt-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0 shadow-sm" />
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            </section>

             {/* Action Items */}
             <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Action Items</h3>
                <div className="space-y-2">
                    {summary.actionItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary-200 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-800 leading-snug">{item.text}</span>
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                                    item.priority === 'High' ? 'bg-red-500' :
                                    item.priority === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} title={`${item.priority} Priority`} />
                            </div>
                            {item.assignee && (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 border border-gray-200">
                                        {item.assignee.charAt(0)}
                                    </div>
                                    <span className="text-xs text-gray-500">{item.assignee}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;