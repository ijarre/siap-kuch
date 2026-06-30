import { describe, expect, it } from "vitest";
import { dashboardMetricIds, getMetricGuideItem, metricGuideItems } from "./metric-guide";

describe("metric guide", () => {
  it("documents every metric shown in the analyzer dashboard", () => {
    for (const metricId of dashboardMetricIds) {
      const item = getMetricGuideItem(metricId);

      expect(item).toBeDefined();
      expect(item?.shortDefinition).not.toHaveLength(0);
      expect(item?.formula).not.toHaveLength(0);
      expect(item?.caveat).not.toHaveLength(0);
    }
  });

  it("distinguishes measured metrics from derived heuristics", () => {
    expect(metricGuideItems.find((item) => item.id === "poseVisibility")?.category).toBe("measured");
    expect(metricGuideItems.find((item) => item.id === "balanceDrift")?.category).toBe("derived");
  });
});
