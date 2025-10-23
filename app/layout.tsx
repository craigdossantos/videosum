import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoSum - AI-Powered Video Meeting Summarizer",
  description: "Transform meeting videos into comprehensive Markdown summaries with embedded screenshots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
