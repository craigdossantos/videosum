/**
 * Tests for the chat API route
 * Mocks the Anthropic SDK to test request/response handling
 */

import { NextRequest } from "next/server";

// Create mock before importing the module
const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));
});

// Import after mocking
import { POST } from "../chat/route";

describe("chat API route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/ai-artifacts/chat", () => {
    it("should return 400 if messages are missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Messages are required");
    });

    it("should return 400 if messages array is empty", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [],
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Messages are required");
    });

    it("should return 500 if ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: "Hello" }],
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("ANTHROPIC_API_KEY not configured");
    });

    it("should return text response from Claude", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Hello! How can I help you?" }],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: "Hello" }],
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe("Hello! How can I help you?");
      expect(data.artifact).toBeNull();
    });

    it("should return artifact when Claude uses save_artifact tool", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          { type: "text", text: "I've created a summary for you." },
          {
            type: "tool_use",
            id: "tool_123",
            name: "save_artifact",
            input: {
              title: "Summary",
              content: "# Summary\n\nKey points here.",
            },
          },
        ],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: "Create a summary" }],
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe("I've created a summary for you.");
      expect(data.artifact).toEqual({
        title: "Summary",
        content: "# Summary\n\nKey points here.",
      });
    });

    it("should pass correct parameters to Anthropic API", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Response" }],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [
              { role: "user", content: "First message" },
              { role: "assistant", content: "First response" },
              { role: "user", content: "Second message" },
            ],
            systemPrompt: "Custom system prompt",
          }),
        },
      );

      await POST(request);

      expect(mockCreate).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: "Custom system prompt",
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "save_artifact" }),
        ]),
        messages: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
          { role: "user", content: "Second message" },
        ],
      });
    });

    it("should handle API errors gracefully", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

      const request = new NextRequest(
        "http://localhost:3000/api/ai-artifacts/chat",
        {
          method: "POST",
          body: JSON.stringify({
            messages: [{ role: "user", content: "Hello" }],
            systemPrompt: "You are helpful",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("API rate limit exceeded");
    });
  });
});
