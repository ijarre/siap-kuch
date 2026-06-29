"use client";

import { summarizePose, type PoseFrame, type PoseLandmark } from "./pose-metrics";
import type { PoseSummary } from "./types";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MAX_SAMPLED_FRAMES = 24;

type ProgressHandler = (message: string) => void;
type PoseLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => { landmarks: PoseLandmark[][] };
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

export async function extractPoseSummary(file: File, onProgress?: ProgressHandler): Promise<PoseSummary> {
  onProgress?.("Loading pose model");
  const [{ FilesetResolver, PoseLandmarker }, video] = await Promise.all([
    import("@mediapipe/tasks-vision"),
    loadVideo(file),
  ]);

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const totalFrames = Math.min(MAX_SAMPLED_FRAMES, Math.max(8, Math.ceil(duration * 2)));
  const frames: PoseFrame[] = [];
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

    for (let index = 0; index < totalFrames; index += 1) {
      const time = totalFrames === 1 ? 0 : (duration * index) / (totalFrames - 1);
      onProgress?.(`Extracting pose frame ${index + 1} of ${totalFrames}`);
      await seekVideo(video, Math.min(time, Math.max(0, duration - 0.05)));
      const result = poseLandmarker.detectForVideo(video, Math.round(video.currentTime * 1000));
      const landmarks = result.landmarks[0] as PoseLandmark[] | undefined;
      if (landmarks?.length) {
        frames.push({
          timestampMs: Math.round(video.currentTime * 1000),
          landmarks,
        });
      }
    }
  } finally {
    poseLandmarker?.close();
    URL.revokeObjectURL(video.src);
  }

  if (frames.length === 0) {
    throw new Error("No player pose was detected. Try a brighter clip where the full body is visible.");
  }

  onProgress?.("Summarizing motion signals");
  return summarizePose(frames, {
    durationSeconds: duration,
    width: video.videoWidth,
    height: video.videoHeight,
  });
}
