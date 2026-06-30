export type MetricCategory = "measured" | "derived" | "ai";

export type MetricGuideItem = {
  id: "poseVisibility" | "sampledFrames" | "stanceRatio" | "balanceDrift" | "followThroughHeight";
  name: string;
  category: MetricCategory;
  shortDefinition: string;
  formula: string;
  interpretation: string;
  caveat: string;
};

export const metricGuideItems: MetricGuideItem[] = [
  {
    id: "poseVisibility",
    name: "Pose visibility",
    category: "measured",
    shortDefinition: "How clearly MediaPipe can see the body landmarks it detects across the sampled video frames.",
    formula: "average landmark visibility score",
    interpretation: "Higher values mean the skeleton estimate is more reliable. Low values usually mean occlusion, poor lighting, or a cropped body.",
    caveat: "This is a computer-vision confidence score, not a quality score for the tennis stroke.",
  },
  {
    id: "sampledFrames",
    name: "Sampled frames",
    category: "measured",
    shortDefinition: "The number of video frames where the app successfully detected a player pose.",
    formula: "detected pose frames from up to 24 sampled timestamps",
    interpretation: "More detected frames give the coach model more motion context across setup, swing, and finish.",
    caveat: "The prototype samples selected frames instead of analyzing every frame, so very fast details can be missed.",
  },
  {
    id: "stanceRatio",
    name: "Stance ratio",
    category: "derived",
    shortDefinition: "A normalized estimate of stance width relative to shoulder width.",
    formula: "average ankle distance / average shoulder width",
    interpretation: "A higher number means the feet are wider relative to the upper body. This helps avoid judging stance from raw pixel distance.",
    caveat: "This is a heuristic proxy. Camera angle, foot visibility, and perspective can shift the number.",
  },
  {
    id: "balanceDrift",
    name: "Balance drift",
    category: "derived",
    shortDefinition: "How much the shoulder center moves side-to-side during the sampled frames, normalized by shoulder width.",
    formula: "horizontal shoulder-center range / average shoulder width",
    interpretation: "Higher drift can indicate visible upper-body movement through the swing, which the coach may inspect for balance or recovery issues.",
    caveat: "This is not true center-of-mass tracking. It is an upper-body movement proxy from 2D landmarks.",
  },
  {
    id: "followThroughHeight",
    name: "Follow-through height",
    category: "derived",
    shortDefinition: "A rough estimate of vertical wrist travel through the sampled swing frames.",
    formula: "wrist vertical range across sampled frames",
    interpretation: "More wrist travel can suggest a larger finish path, but it needs video context before becoming coaching advice.",
    caveat: "The prototype tracks wrists, not the racket head, so it cannot fully describe racket path.",
  },
];

export const dashboardMetricIds = ["poseVisibility", "sampledFrames", "stanceRatio", "balanceDrift"] as const;

export function getMetricGuideItem(id: MetricGuideItem["id"]) {
  return metricGuideItems.find((item) => item.id === id);
}
