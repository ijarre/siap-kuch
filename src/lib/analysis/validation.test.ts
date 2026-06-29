import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES } from "./types";
import { validateVideoFile } from "./validation";

describe("validateVideoFile", () => {
  it("requires a file", () => {
    expect(validateVideoFile(null)).toEqual({
      valid: false,
      message: "Upload one tennis technique video to start analysis.",
    });
  });

  it("accepts supported video files under the size limit", () => {
    expect(validateVideoFile({ name: "forehand.mp4", type: "video/mp4", size: 1024 })).toEqual({ valid: true });
  });

  it("rejects unsupported file types", () => {
    expect(validateVideoFile({ name: "notes.txt", type: "text/plain", size: 1024 }).message).toBe(
      "Use an MP4, MOV, or WebM video file.",
    );
  });

  it("rejects oversized videos", () => {
    expect(validateVideoFile({ name: "long.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 1 }).message).toBe(
      "Keep the prototype clip under 25MB.",
    );
  });
});
