"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeftIcon,
  DownloadIcon,
  ClockIcon,
  CalendarIcon,
  ChatIcon,
  SendIcon,
  XIcon,
  LoaderIcon,
} from "./Icons";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface NotesViewerProps {
  id: string;
  title: string;
  summaryMarkdown: string;
  transcriptHtml: string;
  blogMarkdown?: string; // AI-generated blog post (optional)
  durationSeconds: number;
  processedAt: string;
  onBack: () => void;
}

interface MarkdownSection {
  title: string;
  content: string;
}

function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join("\n").trim();
        sections.push(currentSection);
        currentContent = [];
      }
      // Start new section
      currentSection = {
        title: line.substring(3).trim(),
        content: "",
      };
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join("\n").trim();
    sections.push(currentSection);
  }

  return sections;
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

const NotesViewerCollapsible: React.FC<NotesViewerProps> = ({
  id,
  title,
  summaryMarkdown,
  transcriptHtml,
  durationSeconds,
  processedAt,
  onBack,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse markdown into sections
  const sections = parseMarkdownSections(summaryMarkdown);

  // Collapsible state - first section (Overview) starts open
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      sections.forEach((section, index) => {
        initial[section.title] = index === 0; // First section open
      });
      return initial;
    },
  );

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/class-notes/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleViewTranscript = () => {
    const blob = new Blob([transcriptHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
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

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleSection = (sectionTitle: string) => {
    setSectionStates((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
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
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                View Transcript
              </button>
              <button
                onClick={handleDownloadSummary}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <DownloadIcon className="w-4 h-4" />
                Summary
              </button>
            </div>
          </div>
        </div>

        {/* Content - Collapsible Sections */}
        <div className="p-6 md:p-10 space-y-6">
          {sections.map((section, index) => (
            <Collapsible
              key={section.title}
              open={sectionStates[section.title]}
              onOpenChange={() => toggleSection(section.title)}
            >
              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-[var(--youtube-blue)] transition-colors">
                    {sectionStates[section.title] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </CollapsibleTrigger>
                  <button
                    onClick={() =>
                      copyToClipboard(section.content, section.title)
                    }
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {copiedSection === section.title ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <CollapsibleContent>
                  <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:reading-prose-mobile md:prose-p:reading-prose prose-li:reading-prose-mobile md:prose-li:reading-prose prose-strong:text-gray-900">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </article>
                </CollapsibleContent>
              </section>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col z-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="font-semibold text-gray-900">
                Ask about this class
              </h2>
              <p className="text-sm text-gray-500">Chat with the transcript</p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <XIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <ChatIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Ask questions about the class content.
                </p>
                <p className="text-sm mt-1">
                  Try: &quot;What were the main topics?&quot;
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <LoaderIcon className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesViewerCollapsible;
