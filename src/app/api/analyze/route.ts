import { NextResponse } from "next/server";
import { analyzeWithOpenRouter } from "@/lib/openrouter/client";
import { validateVideoFile } from "@/lib/analysis/validation";
import type { AnalyzeApiError, AnalyzeApiSuccess, PoseSummary } from "@/lib/analysis/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    return jsonError("OPENROUTER_API_KEY is not configured. Add it to .env.local and restart the dev server.", 503);
  }

  try {
    const formData = await request.formData();
    const video = formData.get("video");
    const poseSummaryValue = formData.get("poseSummary");

    if (!(video instanceof File)) {
      return jsonError("Upload one tennis technique video to start analysis.", 400);
    }

    const validation = validateVideoFile(video);
    if (!validation.valid) {
      return jsonError(validation.message || "The uploaded video is invalid.", 400);
    }

    if (typeof poseSummaryValue !== "string") {
      return jsonError("Pose summary is missing from the analysis request.", 400);
    }

    const poseSummary = parsePoseSummary(poseSummaryValue);
    const base64Video = Buffer.from(await video.arrayBuffer()).toString("base64");
    const result = await analyzeWithOpenRouter({
      apiKey,
      model,
      base64Video,
      mimeType: video.type,
      poseSummary,
    });

    return NextResponse.json<AnalyzeApiSuccess>({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return jsonError(message, 500);
  }
}

function parsePoseSummary(value: string): PoseSummary {
  try {
    return JSON.parse(value) as PoseSummary;
  } catch {
    throw new Error("Pose summary was not valid JSON.");
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json<AnalyzeApiError>({ error }, { status });
}
