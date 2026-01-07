"use client";

import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeftIcon,
  DownloadIcon,
  ClockIcon,
  CalendarIcon,
  ChatIcon,
  XIcon,
  ExternalLinkIcon,
} from "./Icons";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  parseMarkdownSections,
  getTitleSection,
  getBodySections,
  isCollapsibleSection,
} from "@/lib/markdown-parser";
import { ChatWithArtifacts } from "@/components/ai-artifacts";

interface NotesViewerProps {
  id: string;
  title: string;
  summaryMarkdown: string; // AI-generated summary (downloadable)
  transcriptHtml: string; // Full transcript HTML (viewable)
  blogMarkdown?: string; // Blog post markdown (optional)
  durationSeconds: number;
  processedAt: string;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CLASS_NOTES_SYSTEM_PROMPT = `You are a helpful teaching assistant for a recorded class. You have access to the full transcript and can help students understand the material.

When the user asks you to create, generate, or make something they might want to keep (summaries, learning points, study guides, practice questions, key takeaways, etc.), use the save_artifact tool to save it.

Be concise but thorough. Reference specific points from the transcript when relevant.

Transcript:
`;

const NotesViewer: React.FC<NotesViewerProps> = ({
  id,
  title,
  summaryMarkdown,
  transcriptHtml,
  blogMarkdown,
  durationSeconds,
  processedAt,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"notes" | "blog">("notes");
  const [chatOpen, setChatOpen] = useState(false);

  // Parse markdown sections for collapsible display
  const sections = useMemo(
    () => parseMarkdownSections(summaryMarkdown),
    [summaryMarkdown],
  );
  const titleSection = useMemo(() => getTitleSection(sections), [sections]);
  const bodySections = useMemo(() => getBodySections(sections), [sections]);

  // Extract plain text from transcript HTML for context
  const transcriptText = useMemo(() => {
    // Simple HTML tag stripping for transcript context
    return transcriptHtml
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [transcriptHtml]);

  const handleViewTranscript = () => {
    // Open transcript HTML in new tab
    const blob = new Blob([transcriptHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Note: We don't revoke immediately so the new tab can load
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadSummary = () => {
    const blob = new Blob([summaryMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBlog = () => {
    if (!blogMarkdown) return;
    const blob = new Blob([blogMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-blog.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 flex-1">
              {title}
            </h1>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`p-2 rounded-lg transition-colors ${
                chatOpen
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              aria-label={chatOpen ? "Close chat" : "Open chat"}
            >
              <ChatIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatDuration(durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(processedAt)}</span>
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button
                onClick={handleViewTranscript}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                View Transcript
              </button>
              <button
                onClick={handleDownloadSummary}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                Summary
              </button>
              {blogMarkdown && (
                <button
                  onClick={handleDownloadBlog}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Blog
                </button>
              )}
            </div>
          </div>

          {/* Tab Bar - only show if blog exists */}
          {blogMarkdown && (
            <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "notes"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Summary Notes
              </button>
              <button
                onClick={() => setActiveTab("blog")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "blog"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Blog Post
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {activeTab === "notes" ? (
            // Notes view with collapsible sections
            <div>
              {/* Title */}
              {titleSection && (
                <h1 className="font-serif text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-blue-600">
                  {titleSection.title}
                </h1>
              )}

              {/* Collapsible Sections */}
              <div className="divide-y divide-gray-100">
                {bodySections.map((section, index) => {
                  const shouldCollapse = isCollapsibleSection(section.id);

                  if (shouldCollapse) {
                    return (
                      <CollapsibleSection
                        key={section.id}
                        title={section.title}
                        defaultOpen={index === 0} // First section open by default
                      >
                        <article className="prose-editorial max-w-none">
                          <ReactMarkdown>{section.content}</ReactMarkdown>
                        </article>
                      </CollapsibleSection>
                    );
                  }

                  // Non-collapsible sections
                  return (
                    <div key={section.id} className="py-6">
                      <h2 className="font-serif text-xl font-semibold text-gray-900 mb-4">
                        {section.title}
                      </h2>
                      <article className="prose-editorial max-w-none">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Blog view - full markdown rendering with editorial styling
            <article className="prose-editorial max-w-none">
              <ReactMarkdown>{blogMarkdown}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>

      {/* Chat Panel - Now using reusable ChatWithArtifacts component */}
      {chatOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="font-semibold text-gray-900">
                Ask about this class
              </h2>
              <p className="text-sm text-gray-500">Chat & create artifacts</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <XIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ChatWithArtifacts handles everything else */}
          <ChatWithArtifacts
            contextId={id}
            context={transcriptText}
            systemPrompt={CLASS_NOTES_SYSTEM_PROMPT}
          />
        </div>
      )}
    </div>
  );
};

export default NotesViewer;
