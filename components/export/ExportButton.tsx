"use client";

import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { VideoRecord } from "@/lib/mvp/types";
import { downloadMarkdown, copyMarkdownToClipboard } from "@/lib/export";

interface ExportButtonProps {
  video: VideoRecord;
}

export function ExportButton({ video }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyMarkdownToClipboard(video);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadMarkdown(video);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy as Markdown
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download .md file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
