import { z } from "zod";

export const ParsedBriefSchema = z.object({
  objective: z.string().min(1, "Objective is required"),
  audience: z.string().min(1, "Audience is required"),
  timing: z.string().optional(),
  kpis: z.array(z.string().min(1)).default([]),
  constraints: z.array(z.string().min(1)).default([])
});

export const TrendBriefItemSchema = z.object({
  theme: z.string().min(1),
  freshness_hint: z.string().min(1),
  query_expansions: z.array(z.string().min(1)).min(1),
  exemplar_hooks: z.array(z.string().min(1)).min(1)
});

export const IdeaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  one_liner: z.string().min(1),
  linked_themes: z.array(z.string().min(1)).min(1),
  brand_fit_guess: z.enum(["high", "med", "low"]),
  required_assets: z.array(z.string().min(1)).default([]),
  risks: z.array(z.string().min(1)).default([])
});

export const ScoreSchema = z.object({
  idea_id: z.string().min(1),
  novelty: z.number().min(0).max(100),
  feasibility: z.number().min(0).max(100),
  roi_proxy: z.number().min(0).max(100),
  risk: z.number().min(0).max(100),
  fit: z.number().min(0).max(100),
  rationale: z.string().min(1)
});

export const PanelNoteSchema = z.object({
  persona: z.enum(["CEO", "CFO", "CTO", "CSO"]),
  approval: z.string().min(1),
  caution: z.string().min(1),
  red_flag: z.string().min(1),
  ask: z.string().min(1)
});

export type ParsedBrief = z.infer<typeof ParsedBriefSchema>;
export type TrendBriefItem = z.infer<typeof TrendBriefItemSchema>;
export type Idea = z.infer<typeof IdeaSchema>;
export type Score = z.infer<typeof ScoreSchema>;
export type PanelNote = z.infer<typeof PanelNoteSchema>;
