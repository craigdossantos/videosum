export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          VideoSum
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl">
          Transform meeting videos into comprehensive Markdown summaries with embedded screenshots
        </p>
        <p className="text-sm text-slate-500">
          AI-Powered Video Meeting Summarizer
        </p>
        <div className="pt-4">
          <p className="text-green-600 font-semibold">
            ✓ Next.js 16 with TypeScript
          </p>
          <p className="text-green-600 font-semibold">
            ✓ Tailwind CSS configured
          </p>
          <p className="text-green-600 font-semibold">
            ✓ App Router enabled
          </p>
        </div>
      </div>
    </div>
  );
}
