"use client";

import { useState, useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  notesDirectory: string;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notesDirectory, setNotesDirectory] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setNotesDirectory(data.notesDirectory);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const body: Record<string, string> = {
        notesDirectory,
      };

      // Only include API keys if they were entered
      if (anthropicKey) {
        body.anthropicApiKey = anthropicKey;
      }
      if (openaiKey) {
        body.openaiApiKey = openaiKey;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        // Clear password fields after save
        setAnthropicKey("");
        setOpenaiKey("");
        // Reload settings to get updated state
        await loadSettings();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Notes Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes Directory
            </label>
            <input
              type="text"
              value={notesDirectory}
              onChange={(e) => setNotesDirectory(e.target.value)}
              placeholder="~/VideoSum"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Where your notes and artifacts are stored
            </p>
          </div>

          {/* API Keys Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">API Keys</h3>

            {/* Anthropic Key */}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">
                Anthropic API Key
                {settings?.hasAnthropicKey && (
                  <span className="ml-2 text-green-600 text-xs">
                    (configured)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={
                  settings?.hasAnthropicKey
                    ? "Leave blank to keep current"
                    : "sk-ant-..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* OpenAI Key */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                OpenAI API Key
                {settings?.hasOpenaiKey && (
                  <span className="ml-2 text-green-600 text-xs">
                    (configured)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={
                  settings?.hasOpenaiKey
                    ? "Leave blank to keep current"
                    : "sk-..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              API keys are stored locally in ~/.videosum/config.json
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
