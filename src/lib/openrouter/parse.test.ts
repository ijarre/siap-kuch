import { describe, expect, it } from "vitest";
import { extractAssistantText, parseDiagnosisFromText } from "./parse";

const responseJson = {
  classification: {
    strokeType: "forehand",
    handedness: "right",
    orientation: "diagonal",
    confidence: "medium",
    reasons: ["Racket path and open stance suggest a forehand."],
  },
  summary: "Good rhythm, but contact spacing is cramped.",
  overallScore: 72,
  phaseBreakdown: [{ phase: "contact", rating: "medium", diagnosis: "Late spacing.", improvementCue: "Contact farther in front." }],
  topIssues: [{ title: "Cramped contact", evidence: "Elbow tucked at contact.", correction: "Create more room.", priority: "high" }],
  improvementCues: ["Prepare earlier."],
  drills: [{ name: "Drop feed spacing", purpose: "Improve contact distance.", instructions: "Feed and freeze at contact." }],
  timestampedObservations: [{ time: "0:03", observation: "Contact is close to the body." }],
  safetyNote: "Use coach review for injury pain.",
};

describe("OpenRouter parser", () => {
  it("extracts assistant content from OpenRouter payloads", () => {
    expect(extractAssistantText({ choices: [{ message: { content: JSON.stringify(responseJson) } }] })).toContain("forehand");
  });

  it("parses fenced JSON diagnosis and normalizes fields", () => {
    const result = parseDiagnosisFromText(`Here is the diagnosis:\n\`\`\`json\n${JSON.stringify(responseJson)}\n\`\`\``);

    expect(result.classification.strokeType).toBe("forehand");
    expect(result.classification.confidence).toBe("medium");
    expect(result.topIssues[0].priority).toBe("high");
    expect(result.drills[0].name).toBe("Drop feed spacing");
  });
});
