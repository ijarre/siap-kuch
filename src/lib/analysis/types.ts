export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export type StrokeType = "forehand" | "backhand" | "serve" | "other" | "uncertain";

export type ConfidenceLevel = "high" | "medium" | "low";

export type Handedness = "right" | "left" | "uncertain";

export type Orientation = "front" | "side" | "rear" | "diagonal" | "uncertain";

export type PoseMetricValue = {
  value: number | null;
  unit: "ratio" | "degrees" | "score";
  note: string;
};

export type PoseSummary = {
  video: {
    durationSeconds: number;
    sampledFrames: number;
    width: number;
    height: number;
  };
  confidence: {
    averageVisibility: number;
    lowConfidenceFrames: number;
  };
  metrics: {
    stanceWidthRatio: PoseMetricValue;
    averageKneeBendDegrees: PoseMetricValue;
    shoulderTurnDegrees: PoseMetricValue;
    hipTurnDegrees: PoseMetricValue;
    torsoTiltDegrees: PoseMetricValue;
    balanceDriftRatio: PoseMetricValue;
    followThroughHeightRatio: PoseMetricValue;
  };
  observations: string[];
};

export type StrokeClassification = {
  strokeType: StrokeType;
  handedness: Handedness;
  orientation: Orientation;
  confidence: ConfidenceLevel;
  reasons: string[];
};

export type PhaseFeedback = {
  phase: "setup" | "unitTurn" | "swingPath" | "contact" | "followThrough" | "recovery";
  rating: ConfidenceLevel;
  diagnosis: string;
  improvementCue: string;
};

export type TechniqueIssue = {
  title: string;
  evidence: string;
  correction: string;
  priority: "high" | "medium" | "low";
};

export type Drill = {
  name: string;
  purpose: string;
  instructions: string;
};

export type TimestampedObservation = {
  time: string;
  observation: string;
};

export type DiagnosisResult = {
  classification: StrokeClassification;
  summary: string;
  overallScore: number;
  phaseBreakdown: PhaseFeedback[];
  topIssues: TechniqueIssue[];
  improvementCues: string[];
  drills: Drill[];
  timestampedObservations: TimestampedObservation[];
  safetyNote: string;
};

export type AnalyzeApiSuccess = {
  result: DiagnosisResult;
};

export type AnalyzeApiError = {
  error: string;
};
