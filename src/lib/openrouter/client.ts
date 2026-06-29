import { buildOpenRouterRequest, DEFAULT_OPENROUTER_MODEL, OPENROUTER_URL } from "./request";
import { extractAssistantText, parseDiagnosisFromText } from "./parse";
import type { DiagnosisResult, PoseSummary } from "@/lib/analysis/types";

type AnalyzeWithOpenRouterInput = {
  apiKey: string;
  base64Video: string;
  mimeType: string;
  poseSummary: PoseSummary;
  model?: string;
};

export async function analyzeWithOpenRouter({
  apiKey,
  base64Video,
  mimeType,
  poseSummary,
  model = DEFAULT_OPENROUTER_MODEL,
}: AnalyzeWithOpenRouterInput): Promise<DiagnosisResult> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Tennis AI Coach Prototype",
    },
    body: JSON.stringify(buildOpenRouterRequest({ base64Video, mimeType, poseSummary, model })),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message = extractOpenRouterError(payload) || `OpenRouter returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  const text = extractAssistantText(payload);
  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return parseDiagnosisFromText(text);
}

function extractOpenRouterError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const error = "error" in payload && typeof payload.error === "object" && payload.error !== null ? payload.error : null;
  if (error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}
