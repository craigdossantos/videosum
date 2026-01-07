import { spawn } from "child_process";
import { NextRequest } from "next/server";
import { writeFile, mkdir, unlink, access } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getNotesDirectory } from "@/lib/settings";

const UPLOAD_DIR = "/tmp/class-notes-uploads";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the notes directory from settings
  const outputDir = await getNotesDirectory();

  // Validate file type
  const validTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];
  if (!validTypes.includes(file.type)) {
    return new Response(
      JSON.stringify({
        error: "Invalid file type. Please upload MP4, WebM, MOV, or AVI.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Save uploaded file to temp location
  await mkdir(UPLOAD_DIR, { recursive: true });
  const tempPath = join(UPLOAD_DIR, `${randomUUID()}-${file.name}`);
  const bytes = await file.arrayBuffer();
  await writeFile(tempPath, Buffer.from(bytes));

  // Get script path relative to project root
  const scriptPath = join(process.cwd(), "scripts", "process_video.py");

  // Build venv path dynamically to avoid Turbopack static analysis issues
  const venvDir = [".", "venv"].join(""); // ".venv"
  const pythonPath = join(process.cwd(), venvDir, "bin", "python3");

  // Check Python venv exists
  if (!(await fileExists(pythonPath))) {
    await unlink(tempPath).catch(() => {});
    return new Response(
      JSON.stringify({
        error: `Python virtual environment not found at ${venvDir}. Run: python3 -m venv ${venvDir} && source ${venvDir}/bin/activate && pip install python-dotenv openai anthropic`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Create a streaming response using SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Build command arguments
      const args = [scriptPath, tempPath, outputDir];
      if (folder) {
        args.push("--folder", folder);
      }

      const pythonProcess = spawn(pythonPath, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
      });

      let stdout = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("PROGRESS:")) {
            const progressJson = line.substring(9);
            try {
              const progress = JSON.parse(progressJson);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`,
                ),
              );
            } catch {
              // Not valid JSON, log it
              console.log("[process_video]", line);
            }
          } else if (line.trim()) {
            console.log("[process_video]", line);
          }
        }
      });

      pythonProcess.on("close", async (code) => {
        // Clean up temp file
        await unlink(tempPath).catch(() => {});

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "complete", ...result })}\n\n`,
              ),
            );
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: "Failed to parse result" })}\n\n`,
              ),
            );
          }
        } else {
          // Try to parse JSON error from stdout
          try {
            const parsed = JSON.parse(stdout);
            if (parsed.status === "error") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: parsed.message })}\n\n`,
                ),
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: `Process exited with code ${code}` })}\n\n`,
                ),
              );
            }
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: `Process exited with code ${code}` })}\n\n`,
              ),
            );
          }
        }
        controller.close();
      });

      pythonProcess.on("error", async (err) => {
        await unlink(tempPath).catch(() => {});
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: `Failed to start process: ${err.message}` })}\n\n`,
          ),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
