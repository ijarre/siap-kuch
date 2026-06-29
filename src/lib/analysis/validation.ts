import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "./types";

export type VideoValidationResult = {
  valid: boolean;
  message?: string;
};

export function validateVideoFile(file: Pick<File, "size" | "type" | "name"> | null): VideoValidationResult {
  if (!file) {
    return { valid: false, message: "Upload one tennis technique video to start analysis." };
  }

  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return { valid: false, message: "Use an MP4, MOV, or WebM video file." };
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return { valid: false, message: "Keep the prototype clip under 25MB." };
  }

  if (file.size === 0) {
    return { valid: false, message: "The selected video is empty." };
  }

  return { valid: true };
}
