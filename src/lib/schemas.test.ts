import { describe, expect, it } from "vitest";
import {
  IdeaSchema,
  PanelNoteSchema,
  ParsedBriefSchema,
  ScoreSchema,
  TrendBriefItemSchema
} from "./schemas";

describe("schemas", () => {
  it("validates a parsed brief", () => {
    const parsed = ParsedBriefSchema.parse({
      objective: "Launch new product awareness",
      audience: "Gen Z snack enthusiasts",
      timing: "Q4",
      kpis: ["Reach", "Video Views"],
      constraints: ["No sugar claims"]
    });

    expect(parsed.kpis).toHaveLength(2);
    expect(parsed.constraints).toContain("No sugar claims");
  });

  it("rejects invalid idea brand fit", () => {
    expect(() =>
      IdeaSchema.parse({
        id: "1",
        title: "Invalid",
        one_liner: "Test",
        linked_themes: ["Test"],
        brand_fit_guess: "wrong",
        required_assets: [],
        risks: []
      })
    ).toThrowError();
  });

  it("ensures trend brief minimums", () => {
    const item = TrendBriefItemSchema.parse({
      theme: "Functional snacking",
      freshness_hint: "Emerging searches in the past 2 weeks",
      query_expansions: ["protein snacks", "late night cravings"],
      exemplar_hooks: ["Snack smarter"]
    });

    expect(item.query_expansions.length).toBeGreaterThan(1);
  });

  it("validates score ranges", () => {
    const score = ScoreSchema.parse({
      idea_id: "1",
      novelty: 80,
      feasibility: 60,
      roi_proxy: 75,
      risk: 20,
      fit: 90,
      rationale: "Strong balance of novelty and fit."
    });

    expect(score.fit).toBe(90);
  });

  it("validates panel note personas", () => {
    const note = PanelNoteSchema.parse({
      persona: "CEO",
      approval: "Greenlight",
      caution: "Monitor production capacity",
      red_flag: "None",
      ask: "Share post-launch KPIs"
    });

    expect(note.persona).toBe("CEO");
  });
});
