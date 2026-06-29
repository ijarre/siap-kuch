import type { DiagnosisResult } from "./types";

export const emptyDiagnosisResult: DiagnosisResult = {
  classification: {
    strokeType: "uncertain",
    handedness: "uncertain",
    orientation: "uncertain",
    confidence: "low",
    reasons: [],
  },
  summary: "",
  overallScore: 0,
  phaseBreakdown: [],
  topIssues: [],
  improvementCues: [],
  drills: [],
  timestampedObservations: [],
  safetyNote: "",
};
