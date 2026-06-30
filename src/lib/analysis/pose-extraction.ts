"use client";

import {
  summarizePose,
  type PoseFrame,
  type PoseLandmark,
} from "./pose-metrics";
import type { PoseSummary } from "./types";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MAX_SAMPLED_FRAMES = 48;
const COARSE_FRAMES = 32;
const REFINE_FRAMES = 16;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;

type ProgressHandler = (message: string) => void;
type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => { landmarks: PoseLandmark[][] };
  close: () => void;
};

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      requestAnimationFrame(() => resolve());
      return;
    }

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not seek through the uploaded video."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = time;
  });
}

function loadVideo(file: File) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.addEventListener(
      "loadedmetadata",
      () => {
        resolve(video);
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read metadata from the selected video."));
      },
      { once: true },
    );
  });
}

export async function extractPoseSummary(
  file: File,
  onProgress?: ProgressHandler,
): Promise<PoseSummary> {
  onProgress?.("Loading pose model");
  const [{ FilesetResolver, PoseLandmarker }, video] = await Promise.all([
    import("@mediapipe/tasks-vision"),
    loadVideo(file),
  ]);

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const coarseCount = Math.min(
    COARSE_FRAMES,
    Math.max(8, Math.ceil(duration * 4)),
  );
  let frames: PoseFrame[] = [];
  let poseLandmarker: PoseLandmarkerInstance | null = null;

  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });

    const detector = poseLandmarker;
    // MediaPipe's VIDEO running mode requires strictly increasing timestamps.
    // The refine pass seeks backward in the clip, so we feed the detector a
    // synthetic monotonic clock while keeping the real video time on the frame
    // for the motion metrics.
    let detectorClockMs = 0;
    const sampleAt = async (time: number): Promise<PoseFrame | null> => {
      const clamped = Math.min(time, Math.max(0, duration - 0.05));
      await seekVideo(video, clamped);
      detectorClockMs += 1;
      const result = detector.detectForVideo(video, detectorClockMs);
      const landmarks = result.landmarks[0] as PoseLandmark[] | undefined;
      if (!landmarks?.length) return null;
      return {
        timestampMs: Math.round(video.currentTime * 1000),
        landmarks,
      };
    };

    // Pass 1: coarse uniform sweep across the whole clip to map the motion.
    const coarseFrames: PoseFrame[] = [];
    for (let index = 0; index < coarseCount; index += 1) {
      const time =
        coarseCount === 1 ? 0 : (duration * index) / (coarseCount - 1);
      onProgress?.(`Scanning motion ${index + 1} of ${coarseCount}`);
      const frame = await sampleAt(time);
      if (frame) coarseFrames.push(frame);
    }

    // Pass 2: re-sample densely around the peak wrist-velocity moment, which
    // brackets the swing and contact where range-based metrics are decided.
    const refineFrames: PoseFrame[] = [];
    const peakTimeMs = findPeakMotionTimestampMs(coarseFrames);
    if (peakTimeMs !== null && duration > 0) {
      const coarseSpacing =
        coarseCount > 1 ? duration / (coarseCount - 1) : duration;
      const halfWindow = Math.max(0.1, coarseSpacing * 1.5);
      const start = Math.max(0, peakTimeMs / 1000 - halfWindow);
      const end = Math.min(duration, peakTimeMs / 1000 + halfWindow);
      const span = end - start;
      for (let index = 0; index < REFINE_FRAMES; index += 1) {
        const time = start + (span * index) / (REFINE_FRAMES - 1);
        onProgress?.(`Refining swing ${index + 1} of ${REFINE_FRAMES}`);
        const frame = await sampleAt(time);
        if (frame) refineFrames.push(frame);
      }
    }

    frames = mergeFrames([...coarseFrames, ...refineFrames]);
  } finally {
    poseLandmarker?.close();
    URL.revokeObjectURL(video.src);
  }

  if (frames.length === 0) {
    throw new Error(
      "No player pose was detected. Try a brighter clip where the full body is visible.",
    );
  }

  onProgress?.("Summarizing motion signals");
  return summarizePose(frames, {
    durationSeconds: duration,
    width: video.videoWidth,
    height: video.videoHeight,
  });
}

function wristCenter(frame: PoseFrame): { x: number; y: number } | null {
  const left = frame.landmarks[LEFT_WRIST];
  const right = frame.landmarks[RIGHT_WRIST];
  if (!left && !right) return null;
  if (left && right) {
    return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  }
  const point = (left ?? right)!;
  return { x: point.x, y: point.y };
}

// Returns the timestamp of the frame with the highest wrist speed relative to
// its neighbors, which marks the most active part of the swing.
function findPeakMotionTimestampMs(frames: PoseFrame[]): number | null {
  if (frames.length < 3) {
    return frames.length > 0
      ? frames[Math.floor(frames.length / 2)].timestampMs
      : null;
  }
  let peakTimestamp: number | null = null;
  let peakSpeed = -1;
  for (let index = 1; index < frames.length - 1; index += 1) {
    const previous = wristCenter(frames[index - 1]);
    const next = wristCenter(frames[index + 1]);
    if (!previous || !next) continue;
    const dt =
      (frames[index + 1].timestampMs - frames[index - 1].timestampMs) / 1000;
    if (dt <= 0) continue;
    const speed = Math.hypot(next.x - previous.x, next.y - previous.y) / dt;
    if (speed > peakSpeed) {
      peakSpeed = speed;
      peakTimestamp = frames[index].timestampMs;
    }
  }
  return peakTimestamp;
}

// Deduplicates frames sampled at nearly identical timestamps and keeps them in
// chronological order so the VIDEO running mode stays monotonic.
function mergeFrames(frames: PoseFrame[]): PoseFrame[] {
  const sorted = [...frames].sort((a, b) => a.timestampMs - b.timestampMs);
  const merged: PoseFrame[] = [];
  for (const frame of sorted) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(frame.timestampMs - last.timestampMs) < 30) continue;
    merged.push(frame);
    if (merged.length >= MAX_SAMPLED_FRAMES) break;
  }
  return merged;
}
