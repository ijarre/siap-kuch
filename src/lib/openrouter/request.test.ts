import { describe, expect, it } from "vitest";
import { buildCoachPrompt, buildOpenRouterRequest } from "./request";
import type { PoseSummary } from "@/lib/analysis/types";

const poseSummary: PoseSummary = {
  video: { durationSeconds: 7, sampledFrames: 14, width: 1280, height: 720 },
  confidence: { averageVisibility: 0.82, lowConfidenceFrames: 1 },
  metrics: {
    stanceWidthRatio: { value: 1.4, unit: "ratio", note: "test" },
    averageKneeBendDegrees: { value: 152, unit: "degrees", note: "test" },
    shoulderTurnDegrees: { value: 36, unit: "degrees", note: "test" },
    hipTurnDegrees: { value: 22, unit: "degrees", note: "test" },
    torsoTiltDegrees: { value: 8, unit: "degrees", note: "test" },
    balanceDriftRatio: { value: 0.2, unit: "ratio", note: "test" },
    followThroughHeightRatio: { value: 0.35, unit: "ratio", note: "test" },
  },
  observations: ["Stance appears narrow."],
};

describe("OpenRouter request builder", () => {
  it("includes video input and stroke classification instructions", () => {
    const request = buildOpenRouterRequest({
      base64Video: "abc123",
      mimeType: "video/mp4",
      poseSummary,
      model: "test/model",
    });

    expect(request.model).toBe("test/model");
    expect(request.messages[0].content[0]).toMatchObject({ type: "text" });
    expect(request.messages[0].content[1]).toMatchObject({
      type: "video_url",
      video_url: { url: "data:video/mp4;base64,abc123" },
    });
    expect(buildCoachPrompt(poseSummary)).toContain("First infer the stroke type without asking the user");
  });
});
