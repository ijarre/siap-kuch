import type { PoseMetricValue, PoseSummary } from "./types";

export type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: PoseLandmark[];
};

export type VideoMetadata = {
  durationSeconds: number;
  width: number;
  height: number;
};

const LANDMARK = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftWrist: 15,
  rightWrist: 16,
};

const missingMetric = (
  note: string,
  unit: PoseMetricValue["unit"] = "score",
): PoseMetricValue => ({
  value: null,
  unit,
  note,
});

const metric = (
  value: number,
  unit: PoseMetricValue["unit"],
  note: string,
): PoseMetricValue => ({
  value: Number(value.toFixed(2)),
  unit,
  note,
});

const distance = (a?: PoseLandmark, b?: PoseLandmark) => {
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const midpoint = (a?: PoseLandmark, b?: PoseLandmark): PoseLandmark | null => {
  if (!a || !b) return null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: ((a.visibility ?? 0) + (b.visibility ?? 0)) / 2,
  };
};

const angleDegrees = (a?: PoseLandmark, b?: PoseLandmark, c?: PoseLandmark) => {
  if (!a || !b || !c) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (mag === 0) return null;
  const radians = Math.acos(Math.min(1, Math.max(-1, dot / mag)));
  return (radians * 180) / Math.PI;
};

const average = (values: Array<number | null>) => {
  const clean = values.filter((value): value is number =>
    Number.isFinite(value),
  );
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
};

const range = (values: Array<number | null>) => {
  const clean = values.filter((value): value is number =>
    Number.isFinite(value),
  );
  if (clean.length === 0) return null;
  return Math.max(...clean) - Math.min(...clean);
};

const segmentWidth = (
  frame: PoseFrame,
  leftIndex: number,
  rightIndex: number,
) => distance(frame.landmarks[leftIndex], frame.landmarks[rightIndex]);

const verticalRange = (frames: PoseFrame[], index: number) =>
  range(frames.map((frame) => frame.landmarks[index]?.y ?? null));

// MediaPipe normalizes x by image width and y by image height, while z shares
// roughly the same scale as x. Converting to a consistent pixel space before any
// distance or angle calculation removes the aspect-ratio distortion that would
// otherwise warp every Euclidean distance and angle on non-square video.
const toPixelFrame = (
  frame: PoseFrame,
  width: number,
  height: number,
): PoseFrame => ({
  timestampMs: frame.timestampMs,
  landmarks: frame.landmarks.map((landmark) => ({
    x: landmark.x * width,
    y: landmark.y * height,
    z: (landmark.z ?? 0) * width,
    visibility: landmark.visibility,
  })),
});

export function summarizePose(
  frames: PoseFrame[],
  metadata: VideoMetadata,
): PoseSummary {
  const width = metadata.width > 0 ? metadata.width : 1;
  const height = metadata.height > 0 ? metadata.height : 1;
  const pixelFrames = frames.map((frame) => toPixelFrame(frame, width, height));

  const visibilityScores = frames.flatMap((frame) =>
    frame.landmarks
      .map((landmark) => landmark.visibility ?? 0)
      .filter((visibility) => visibility > 0),
  );
  const averageVisibility = average(visibilityScores) ?? 0;
  const lowConfidenceFrames = frames.filter((frame) => {
    const visible =
      average(frame.landmarks.map((landmark) => landmark.visibility ?? 0)) ?? 0;
    return visible < 0.45;
  }).length;

  const shoulderWidths = pixelFrames.map((frame) =>
    segmentWidth(frame, LANDMARK.leftShoulder, LANDMARK.rightShoulder),
  );
  const averageShoulderWidth = average(shoulderWidths);
  const stanceWidths = pixelFrames.map((frame) =>
    segmentWidth(frame, LANDMARK.leftAnkle, LANDMARK.rightAnkle),
  );
  const kneeAngles = pixelFrames.flatMap((frame) => [
    angleDegrees(
      frame.landmarks[LANDMARK.leftHip],
      frame.landmarks[LANDMARK.leftKnee],
      frame.landmarks[LANDMARK.leftAnkle],
    ),
    angleDegrees(
      frame.landmarks[LANDMARK.rightHip],
      frame.landmarks[LANDMARK.rightKnee],
      frame.landmarks[LANDMARK.rightAnkle],
    ),
  ]);
  const shoulderTurns = pixelFrames.map((frame) => {
    const left = frame.landmarks[LANDMARK.leftShoulder];
    const right = frame.landmarks[LANDMARK.rightShoulder];
    if (!left || !right) return null;
    return (
      (Math.atan2((left.z ?? 0) - (right.z ?? 0), left.x - right.x) * 180) /
      Math.PI
    );
  });
  const hipTurns = pixelFrames.map((frame) => {
    const left = frame.landmarks[LANDMARK.leftHip];
    const right = frame.landmarks[LANDMARK.rightHip];
    if (!left || !right) return null;
    return (
      (Math.atan2((left.z ?? 0) - (right.z ?? 0), left.x - right.x) * 180) /
      Math.PI
    );
  });
  const torsoTilts = pixelFrames.map((frame) => {
    const shoulderCenter = midpoint(
      frame.landmarks[LANDMARK.leftShoulder],
      frame.landmarks[LANDMARK.rightShoulder],
    );
    const hipCenter = midpoint(
      frame.landmarks[LANDMARK.leftHip],
      frame.landmarks[LANDMARK.rightHip],
    );
    if (!shoulderCenter || !hipCenter) return null;
    return Math.abs(
      (Math.atan2(
        shoulderCenter.x - hipCenter.x,
        hipCenter.y - shoulderCenter.y,
      ) *
        180) /
        Math.PI,
    );
  });
  const shoulderCenterX = pixelFrames.map(
    (frame) =>
      midpoint(
        frame.landmarks[LANDMARK.leftShoulder],
        frame.landmarks[LANDMARK.rightShoulder],
      )?.x ?? null,
  );
  const wristHeightRange = Math.max(
    verticalRange(pixelFrames, LANDMARK.leftWrist) ?? 0,
    verticalRange(pixelFrames, LANDMARK.rightWrist) ?? 0,
  );

  const stanceRatio =
    averageShoulderWidth && averageShoulderWidth > 0
      ? (average(stanceWidths) ?? 0) / averageShoulderWidth
      : null;
  const balanceDrift =
    averageShoulderWidth && averageShoulderWidth > 0
      ? (range(shoulderCenterX) ?? 0) / averageShoulderWidth
      : null;
  const followThroughHeightRatio =
    averageShoulderWidth && averageShoulderWidth > 0
      ? wristHeightRange / averageShoulderWidth
      : null;

  const observations: string[] = [];
  if (averageVisibility < 0.55) {
    observations.push(
      "Pose confidence is low; the model should treat fine-grained body mechanics cautiously.",
    );
  }
  if (stanceRatio !== null && stanceRatio < 1.1) {
    observations.push("Stance appears narrow relative to shoulder width.");
  }
  if (balanceDrift !== null && balanceDrift > 0.55) {
    observations.push("Upper-body center shifts noticeably through the clip.");
  }
  if (followThroughHeightRatio !== null && followThroughHeightRatio < 0.4) {
    observations.push("Wrist path movement is limited in the sampled frames.");
  }

  return {
    video: {
      durationSeconds: Number(metadata.durationSeconds.toFixed(2)),
      sampledFrames: frames.length,
      width: metadata.width,
      height: metadata.height,
    },
    confidence: {
      averageVisibility: Number(averageVisibility.toFixed(2)),
      lowConfidenceFrames,
    },
    metrics: {
      stanceWidthRatio:
        stanceRatio === null
          ? missingMetric(
              "Could not compare ankle width to shoulder width.",
              "ratio",
            )
          : metric(
              stanceRatio,
              "ratio",
              "Average ankle distance divided by average shoulder width.",
            ),
      averageKneeBendDegrees:
        average(kneeAngles) === null
          ? missingMetric(
              "Knee landmarks were not stable enough to estimate bend.",
              "degrees",
            )
          : metric(
              average(kneeAngles) ?? 0,
              "degrees",
              "Average angle through hip-knee-ankle across both legs.",
            ),
      shoulderTurnDegrees:
        range(shoulderTurns) === null
          ? missingMetric(
              "Shoulder landmarks were not stable enough to estimate rotation.",
              "degrees",
            )
          : metric(
              range(shoulderTurns) ?? 0,
              "degrees",
              "Range of shoulder-line rotation inferred from x/z landmarks. Depth (z) from the lite model is a rough estimate, so treat as approximate.",
            ),
      hipTurnDegrees:
        range(hipTurns) === null
          ? missingMetric(
              "Hip landmarks were not stable enough to estimate rotation.",
              "degrees",
            )
          : metric(
              range(hipTurns) ?? 0,
              "degrees",
              "Range of hip-line rotation inferred from x/z landmarks. Depth (z) from the lite model is a rough estimate, so treat as approximate.",
            ),
      torsoTiltDegrees:
        average(torsoTilts) === null
          ? missingMetric("Could not estimate torso tilt.", "degrees")
          : metric(
              average(torsoTilts) ?? 0,
              "degrees",
              "Average lateral torso lean from shoulder and hip centers.",
            ),
      balanceDriftRatio:
        balanceDrift === null
          ? missingMetric("Could not estimate balance drift.", "ratio")
          : metric(
              balanceDrift,
              "ratio",
              "Horizontal shoulder-center drift divided by shoulder width.",
            ),
      followThroughHeightRatio:
        followThroughHeightRatio === null
          ? missingMetric(
              "Could not estimate wrist travel relative to shoulder width.",
              "ratio",
            )
          : metric(
              followThroughHeightRatio,
              "ratio",
              "Vertical wrist travel across sampled frames divided by shoulder width.",
            ),
    },
    observations,
  };
}
