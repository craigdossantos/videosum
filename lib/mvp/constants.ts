import { VideoRecord, VideoStatus, SourceType } from './types';

export const MOCK_TRANSCRIPT = `
John (Product Manager): Okay everyone, thanks for joining the Q3 planning meeting. Let's review the designs for the new "Dark Mode" feature.
Sarah (Designer): Sure, let me share my screen. As you can see here on Slide 1, we've opted for a slate gray palette rather than pure black to reduce eye strain.
David (Dev Lead): That looks good. However, implementing this across the legacy dashboard will be tricky. We might need 2 sprints for that.
John: Noted. Sarah, can you export the assets by Friday?
Sarah: Yes, I'll have them ready.
David: Also, are we updating the mobile app simultaneously?
John: No, mobile is pushed to Q4. Let's focus on web first.
Action Item: Sarah to export assets by Friday.
Action Item: David to scope legacy dashboard changes.
`;

export const INITIAL_VIDEOS: VideoRecord[] = [
  {
    id: 'v1',
    title: 'Q3 Product Strategy Sync',
    date: 'Oct 15, 2025',
    duration: '45:30',
    status: VideoStatus.COMPLETED,
    sourceType: SourceType.ZOOM,
    thumbnailUrl: 'https://picsum.photos/seed/meeting1/300/170',
    summary: {
      executiveSummary: "The team aligned on the Q3 strategy, focusing primarily on the 'Dark Mode' release for the web platform. Mobile updates are deferred to Q4.",
      keyTakeaways: [
        "Dark Mode uses a slate gray palette.",
        "Legacy dashboard implementation is high effort.",
        "Mobile app update pushed to Q4."
      ],
      actionItems: [
        { text: "Export design assets", assignee: "Sarah", priority: "High" },
        { text: "Scope legacy dashboard changes", assignee: "David", priority: "Medium" }
      ],
      sentiment: "Neutral"
    },
    timeline: [
      { timestamp: "02:15", description: "Introduction and Agenda", isSlide: false, imageUrl: "https://picsum.photos/seed/frame1/400/225" },
      { timestamp: "05:40", description: "Dark Mode Design Review", isSlide: true, imageUrl: "https://picsum.photos/seed/frame2/400/225" },
      { timestamp: "12:20", description: "Technical Feasibility Discussion", isSlide: false, imageUrl: "https://picsum.photos/seed/frame3/400/225" }
    ]
  }
];