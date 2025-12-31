import React from "react";

/**
 * Mock for react-markdown that renders children as plain text
 * This avoids ESM module issues in Jest
 */
const ReactMarkdown = ({ children }: { children: string }) => {
  return <div data-testid="markdown-content">{children}</div>;
};

export default ReactMarkdown;
