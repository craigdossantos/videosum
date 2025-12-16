export enum VideoStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum SourceType {
  UPLOAD = 'UPLOAD',
  ZOOM = 'ZOOM',
  YOUTUBE = 'YOUTUBE',
  MEET = 'MEET'
}

export interface ActionItem {
  text: string;
  assignee?: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface TimelineEvent {
  timestamp: string; // e.g., "04:15"
  description: string;
  imageUrl?: string; // Mocked screenshot URL
  isSlide: boolean;
}

export interface MeetingSummary {
  executiveSummary: string;
  keyTakeaways: string[];
  actionItems: ActionItem[];
  sentiment: 'Positive' | 'Neutral' | 'Concerned';
}

export interface VideoRecord {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: VideoStatus;
  sourceType: SourceType;
  thumbnailUrl: string;
  fileUrl?: string;
  summary?: MeetingSummary;
  timeline?: TimelineEvent[];
}