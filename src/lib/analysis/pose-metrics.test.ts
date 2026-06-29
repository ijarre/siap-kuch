import { describe, expect, it } from "vitest";
import { summarizePose, type PoseFrame, type PoseLandmark } from "./pose-metrics";

function landmarks(overrides: Record<number, Partial<PoseLandmark>>): PoseLandmark[] {
  return Array.from({ length: 33 }, (_, index) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
    ...overrides[index],
  }));
}

describe("summarizePose", () => {
  it("turns sampled landmarks into coaching metrics", () => {
    const frames: PoseFrame[] = [
      {
        timestampMs: 0,
        landmarks: landmarks({
          11: { x: 0.4, y: 0.3, z: 0.01 },
          12: { x: 0.6, y: 0.3, z: -0.01 },
          23: { x: 0.42, y: 0.55, z: 0.01 },
          24: { x: 0.58, y: 0.55, z: -0.01 },
          25: { x: 0.4, y: 0.72 },
          26: { x: 0.6, y: 0.72 },
          27: { x: 0.32, y: 0.9 },
          28: { x: 0.68, y: 0.9 },
          15: { x: 0.38, y: 0.48 },
          16: { x: 0.62, y: 0.46 },
        }),
      },
      {
        timestampMs: 500,
        landmarks: landmarks({
          11: { x: 0.36, y: 0.28, z: 0.08 },
          12: { x: 0.64, y: 0.32, z: -0.08 },
          23: { x: 0.4, y: 0.55, z: 0.04 },
          24: { x: 0.6, y: 0.55, z: -0.04 },
          25: { x: 0.38, y: 0.7 },
          26: { x: 0.62, y: 0.7 },
          27: { x: 0.28, y: 0.9 },
          28: { x: 0.72, y: 0.9 },
          15: { x: 0.35, y: 0.28 },
          16: { x: 0.72, y: 0.22 },
        }),
      },
    ];

    const summary = summarizePose(frames, { durationSeconds: 1, width: 1920, height: 1080 });

    expect(summary.video.sampledFrames).toBe(2);
    expect(summary.confidence.averageVisibility).toBe(0.9);
    expect(summary.metrics.stanceWidthRatio.value).toBeGreaterThan(1);
    expect(summary.metrics.followThroughHeightRatio.value).toBeGreaterThan(0.1);
  });
});
