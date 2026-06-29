import type { DiagnosisResult, PoseSummary } from "@/lib/analysis/types";

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-pro";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type BuildOpenRouterRequestInput = {
  base64Video: string;
  mimeType: string;
  poseSummary: PoseSummary;
  model?: string;
};

export function buildCoachPrompt(poseSummary: PoseSummary) {
  return `You are an expert tennis technique coach for recreational and intermediate players.

Analyze the uploaded tennis video and the pose summary. First infer the stroke type without asking the user. Then diagnose technique.

Required classification:
- strokeType: one of "forehand", "backhand", "serve", "other", "uncertain"
- handedness: one of "right", "left", "uncertain"
- orientation: one of "front", "side", "rear", "diagonal", "uncertain"
- confidence: one of "high", "medium", "low"
- reasons: specific visual or motion evidence

Coaching rubric:
- setup: spacing, athletic base, readiness
- unitTurn: shoulder and hip preparation, racket/body loading
- swingPath: path shape, sequencing, balance
- contact: contact-zone posture, spacing, head/torso stability
- followThrough: finish height, rotation completion, deceleration
- recovery: balance and reset

Use these pose metrics as objective evidence. Do not overstate certainty when visibility is low.
${JSON.stringify(poseSummary, null, 2)}

Return only valid JSON matching this TypeScript shape:
${diagnosisSchemaForPrompt()}`;
}

export function buildOpenRouterRequest({ base64Video, mimeType, poseSummary, model }: BuildOpenRouterRequestInput) {
  return {
    model: model || DEFAULT_OPENROUTER_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildCoachPrompt(poseSummary),
          },
          {
            type: "video_url",
            video_url: {
              url: `data:${mimeType};base64,${base64Video}`,
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2200,
  };
}

function diagnosisSchemaForPrompt() {
  return `{
  "classification": {
    "strokeType": "forehand | backhand | serve | other | uncertain",
    "handedness": "right | left | uncertain",
    "orientation": "front | side | rear | diagonal | uncertain",
    "confidence": "high | medium | low",
    "reasons": ["short evidence string"]
  },
  "summary": "plain language diagnosis summary",
  "overallScore": 0-100,
  "phaseBreakdown": [
    {
      "phase": "setup | unitTurn | swingPath | contact | followThrough | recovery",
      "rating": "high | medium | low",
      "diagnosis": "what is happening",
      "improvementCue": "one actionable cue"
    }
  ],
  "topIssues": [
    {
      "title": "issue name",
      "evidence": "video or pose evidence",
      "correction": "specific fix",
      "priority": "high | medium | low"
    }
  ],
  "improvementCues": ["short coaching cue"],
  "drills": [
    {
      "name": "drill name",
      "purpose": "why it helps",
      "instructions": "how to do it"
    }
  ],
  "timestampedObservations": [
    {
      "time": "0:03",
      "observation": "specific observation"
    }
  ],
  "safetyNote": "quality or certainty caveat"
}`;
}

export function resultLooksComplete(result: DiagnosisResult) {
  return Boolean(
    result.classification?.strokeType &&
      result.classification?.confidence &&
      result.summary &&
      Array.isArray(result.phaseBreakdown) &&
      Array.isArray(result.topIssues) &&
      Array.isArray(result.drills),
  );
}
