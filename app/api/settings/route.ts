import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await loadSettings();
    // Don't expose API keys in response
    return NextResponse.json({
      notesDirectory: settings.notesDirectory,
      hasAnthropicKey: !!settings.anthropicApiKey,
      hasOpenaiKey: !!settings.openaiApiKey,
    });
  } catch (error) {
    console.error("Failed to load settings:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const currentSettings = await loadSettings();

    const newSettings: AppSettings = {
      ...currentSettings,
      notesDirectory: body.notesDirectory || currentSettings.notesDirectory,
    };

    // Only update API keys if provided
    if (body.anthropicApiKey !== undefined) {
      newSettings.anthropicApiKey = body.anthropicApiKey || undefined;
    }
    if (body.openaiApiKey !== undefined) {
      newSettings.openaiApiKey = body.openaiApiKey || undefined;
    }

    await saveSettings(newSettings);

    return NextResponse.json({
      success: true,
      notesDirectory: newSettings.notesDirectory,
    });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
