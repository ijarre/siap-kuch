import { emptyDiagnosisResult } from "@/lib/analysis/sample-data";
import type {
  ConfidenceLevel,
  DiagnosisResult,
  Handedness,
  Orientation,
  PhaseFeedback,
  StrokeType,
  TechniqueIssue,
} from "@/lib/analysis/types";
import { resultLooksComplete } from "./request";

const strokeTypes = new Set<StrokeType>(["forehand", "backhand", "serve", "other", "uncertain"]);
const confidenceLevels = new Set<ConfidenceLevel>(["high", "medium", "low"]);
const handednessValues = new Set<Handedness>(["right", "left", "uncertain"]);
const orientationValues = new Set<Orientation>(["front", "side", "rear", "diagonal", "uncertain"]);
const phases = new Set<PhaseFeedback["phase"]>(["setup", "unitTurn", "swingPath", "contact", "followThrough", "recovery"]);
const priorities = new Set<TechniqueIssue["priority"]>(["high", "medium", "low"]);

type UnknownRecord = Record<string, unknown>;

export function extractAssistantText(payload: unknown) {
  const root = isRecord(payload) ? payload : {};
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const firstChoice = isRecord(choices[0]) ? choices[0] : {};
  const message = isRecord(firstChoice.message) ? firstChoice.message : {};
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function parseDiagnosisFromText(text: string): DiagnosisResult {
  const json = parseJsonFromText(text);
  const result = normalizeDiagnosis(json);
  if (!resultLooksComplete(result)) {
    throw new Error("AI response did not include the required diagnosis fields.");
  }
  return result;
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON.");
  }
}

function normalizeDiagnosis(value: unknown): DiagnosisResult {
  const root = isRecord(value) ? value : {};
  const classification = isRecord(root.classification) ? root.classification : {};

  return {
    ...emptyDiagnosisResult,
    classification: {
      strokeType: pickEnum(classification.strokeType, strokeTypes, "uncertain"),
      handedness: pickEnum(classification.handedness, handednessValues, "uncertain"),
      orientation: pickEnum(classification.orientation, orientationValues, "uncertain"),
      confidence: pickEnum(classification.confidence, confidenceLevels, "low"),
      reasons: stringArray(classification.reasons).slice(0, 5),
    },
    summary: stringValue(root.summary),
    overallScore: clampScore(root.overallScore),
    phaseBreakdown: arrayOfRecords(root.phaseBreakdown)
      .map((phase) => ({
        phase: pickEnum(phase.phase, phases, "setup"),
        rating: pickEnum(phase.rating, confidenceLevels, "low"),
        diagnosis: stringValue(phase.diagnosis),
        improvementCue: stringValue(phase.improvementCue),
      }))
      .slice(0, 6),
    topIssues: arrayOfRecords(root.topIssues)
      .map((issue) => ({
        title: stringValue(issue.title),
        evidence: stringValue(issue.evidence),
        correction: stringValue(issue.correction),
        priority: pickEnum(issue.priority, priorities, "medium"),
      }))
      .slice(0, 3),
    improvementCues: stringArray(root.improvementCues).slice(0, 6),
    drills: arrayOfRecords(root.drills)
      .map((drill) => ({
        name: stringValue(drill.name),
        purpose: stringValue(drill.purpose),
        instructions: stringValue(drill.instructions),
      }))
      .slice(0, 3),
    timestampedObservations: arrayOfRecords(root.timestampedObservations)
      .map((observation) => ({
        time: stringValue(observation.time),
        observation: stringValue(observation.observation),
      }))
      .slice(0, 6),
    safetyNote: stringValue(root.safetyNote),
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayOfRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}
