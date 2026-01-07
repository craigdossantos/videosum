"use client";

import { useState, useRef, useEffect } from "react";
import { ArtifactCard } from "./ArtifactCard";
import type { Artifact } from "@/lib/ai-artifacts";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  artifact?: Artifact;
}

interface ChatWithArtifactsProps {
  contextId: string;
  context: string;
  systemPrompt?: string;
  onArtifactCreated?: (artifact: Artifact) => void;
}

// Inline icons for self-contained reusability
const SendIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant. When the user asks you to create, generate, or make something they might want to keep (summaries, learning points, blog posts, study guides, etc.), use the save_artifact tool to save it.

Context:
`;

export function ChatWithArtifacts({
  contextId,
  context,
  systemPrompt,
  onArtifactCreated,
}: ChatWithArtifactsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing artifacts on mount
  useEffect(() => {
    loadArtifacts();
  }, [contextId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadArtifacts = async () => {
    try {
      const response = await fetch(
        `/api/ai-artifacts/${encodeURIComponent(contextId)}/artifacts`,
      );
      if (response.ok) {
        const data = await response.json();
        setArtifacts(data.artifacts || []);
      }
    } catch (err) {
      console.error("Failed to load artifacts:", err);
    }
  };

  const saveArtifact = async (artifact: {
    title: string;
    content: string;
  }): Promise<Artifact | null> => {
    try {
      const response = await fetch(
        `/api/ai-artifacts/${encodeURIComponent(contextId)}/artifacts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: artifact.title,
            content: artifact.content,
            prompt: input,
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        setArtifacts((prev) => [...prev, data.artifact]);
        onArtifactCreated?.(data.artifact);
        return data.artifact;
      }
    } catch (err) {
      console.error("Failed to save artifact:", err);
    }
    return null;
  };

  const deleteArtifact = async (artifactId: string) => {
    try {
      const response = await fetch(
        `/api/ai-artifacts/${encodeURIComponent(contextId)}/artifacts?id=${encodeURIComponent(artifactId)}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
        // Also remove from messages
        setMessages((prev) =>
          prev.map((m) =>
            m.artifact?.id === artifactId ? { ...m, artifact: undefined } : m,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to delete artifact:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const fullSystemPrompt =
        (systemPrompt || DEFAULT_SYSTEM_PROMPT) + context;

      const response = await fetch("/api/ai-artifacts/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: fullSystemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Chat request failed");
      }

      const data = await response.json();

      // Save artifact if one was created
      let savedArtifact: Artifact | null = null;
      if (data.artifact) {
        savedArtifact = await saveArtifact(data.artifact);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text || "",
        artifact: savedArtifact || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">
              Ask questions about the content or request to create artifacts
              like summaries, learning points, or blog posts.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>

            {/* Show artifact inline if one was created */}
            {message.artifact && (
              <div className="ml-4">
                <ArtifactCard
                  artifact={message.artifact}
                  onDelete={() => deleteArtifact(message.artifact!.id)}
                  compact
                />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Saved artifacts section */}
      {artifacts.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Saved Artifacts ({artifacts.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onDelete={() => deleteArtifact(artifact.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or request an artifact..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
