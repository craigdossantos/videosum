"use client";

import SummaryView from "@/components/mvp/SummaryView";
import { VideoRecord, VideoStatus, SourceType } from "@/lib/mvp/types";

const mockVideo: VideoRecord = {
  id: "test-1",
  title: "Q3 Product Strategy Sync",
  date: "Oct 15, 2025",
  duration: "45:30",
  status: VideoStatus.COMPLETED,
  sourceType: SourceType.ZOOM,
  thumbnailUrl: "https://picsum.photos/seed/meeting1/300/170",
  summary: {
    executiveSummary:
      "The team aligned on the Q3 strategy, focusing primarily on the 'Dark Mode' release for the web platform. Mobile updates are deferred to Q4. The discussion covered design considerations, technical feasibility, and resource allocation. Sarah presented the design mockups with a slate gray palette to reduce eye strain, while David raised concerns about implementation complexity in the legacy dashboard. The team agreed to prioritize web implementation first, with mobile updates pushed to Q4.",
    keyTakeaways: [
      "Dark Mode uses a slate gray palette to reduce eye strain and provide better contrast",
      "Legacy dashboard implementation requires significant refactoring and may take 2 sprints",
      "Mobile app update has been strategically pushed to Q4 to focus resources on web platform",
      "Design assets will be exported by Friday for immediate development start",
      "Technical feasibility concerns were addressed with a phased rollout approach",
    ],
    actionItems: [
      {
        text: "Export design assets including color palette, component library, and mockups",
        assignee: "Sarah",
        priority: "High",
      },
      {
        text: "Scope legacy dashboard changes and create technical specification document",
        assignee: "David",
        priority: "Medium",
      },
      {
        text: "Schedule follow-up meeting to review technical specification",
        assignee: "John",
        priority: "Low",
      },
    ],
    sentiment: "Positive",
  },
  timeline: [
    {
      timestamp: "02:15",
      description: "Introduction and Agenda",
      isSlide: false,
      imageUrl: "https://picsum.photos/seed/frame1/400/225",
    },
    {
      timestamp: "05:40",
      description: "Dark Mode Design Review",
      isSlide: true,
      imageUrl: "https://picsum.photos/seed/frame2/400/225",
    },
    {
      timestamp: "12:20",
      description: "Technical Feasibility Discussion",
      isSlide: false,
      imageUrl: "https://picsum.photos/seed/frame3/400/225",
    },
    {
      timestamp: "18:45",
      description: "Resource Allocation Planning",
      isSlide: true,
      imageUrl: "https://picsum.photos/seed/frame4/400/225",
    },
  ],
};

export default function TestSummaryPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <SummaryView
        video={mockVideo}
        onBack={() => (window.location.href = "/demo")}
      />
    </div>
  );
}
