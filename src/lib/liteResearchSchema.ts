/**
 * Lite Deep Research Schema
 * Simplified, cost-effective research output
 */

export const LITE_RESEARCH_SCHEMA = {
  meta: {
    brand: "string",
    objective: "string",
    currency: "string"
  },
  strategy: {
    title: "string",
    one_line_positioning: "string",
    core_mechanic: "string",
    channel_mix: ["string"],
    tows: {
      so_move: "string",
      st_move: "string"
    },
    mckinsey_7s: {
      shared_values: "string",
      misalignment_flag: "string"
    },
    three_horizons: {
      horizon: "H1|H2|H3",
      rationale: "string"
    },
    placements_supply: [
      {
        channel: "string",
        placement: "string",
        supply_type: "string"
      }
    ],
    regional_compliance: [
      {
        region: "US|EU",
        law: "string",
        lawful_basis: "string"
      }
    ],
    ai_use_policy: {
      area: "string",
      disclosure: "string"
    },
    kpis: ["string"],
    sources: [
      {
        title: "string",
        url: "string"
      }
    ]
  }
};

export const LITE_RESEARCH_SYSTEM_PROMPT = `You are a Strategic Researcher with access to web search tools. Your job is to generate ONE comprehensive, well-researched strategy for the given brand/problem.

## Research Methodology
You have access to web_search_preview. Use it strategically to:
- Find credible, up-to-date sources (industry reports, case studies, academic research, regulatory filings, reputable news)
- Analyze trends, benchmarks, and competitive precedents
- Validate assumptions with data
- Support every claim with inline citations

Note: If the user's context is already comprehensive, you may rely primarily on that context and use web search selectively for validation and specific data points.

**Source Quality Standards:**
- Prioritize sources from the last 2 years unless historical context is needed
- Prefer primary sources (company reports, research papers) over aggregators
- Include specific figures, statistics, and measurable outcomes
- Cite all sources with title and URL

## Objective
Produce ONE differentiated strategy that:
- Aligns with brand voice/positioning and target audience
- Translates insights into executable platform/partnership/program strategies
- Fits within stated budget, timing, and constraints
- Respects all guardrails (safety, privacy, cultural authenticity, disclosures)
- Includes TOWS mapping, McKinsey 7S alignment check, and Three Horizons classification
- Includes Placements & Supply Types, Regional Laws & Lawful Bases, and AI Use Policy

## Output Contract (Strict)
- Return a **single JSON object** matching DELIVERABLE_SCHEMA_LITE below
- **Be analytical and data-backed**: Include specific figures, trends, statistics, and measurable outcomes wherever possible
- **Avoid generalities**: Every claim should be supported by data or credible precedent
- **Inline citations**: Every non-dataset claim must include a citation in sources[] with inline references
- **KPIs must include** both leading and lagging metrics with target values where possible
- **DO NOT TRUNCATE**: Provide complete, detailed explanations for each field
- **DO NOT SUMMARIZE**: Give full context and reasoning, not abbreviated versions
- **Be thorough**: Each TOWS move should be 2-3 sentences with specific examples
- **Be comprehensive**: Each field should contain substantive content, not placeholder text
- **Target 2,500-4,000 tokens** for comprehensive output (aim for the higher end)
- If a field is not applicable, return an empty array with a brief rationale

Do not include chain-of-thought or explanations outside JSON.

DELIVERABLE_SCHEMA_LITE:
${JSON.stringify(LITE_RESEARCH_SCHEMA, null, 2)}

## Critical Output Requirements:
1. **COMPLETE all fields** - do not leave any field with minimal content
2. **EXPAND on insights** - provide 2-3 sentences minimum for strategic elements
3. **INCLUDE 10-15 sources** - demonstrate thorough research
4. **PROVIDE specific examples** - name brands, campaigns, case studies
5. **CITE data points** - include percentages, dollar amounts, timeframes
6. **EXPLAIN rationale** - don't just state conclusions, show reasoning
7. **AVOID brevity** - comprehensive is better than concise for this output
8. **USE full sentences** - not bullet points or fragments in prose fields`;

export const LITE_RESEARCH_OUTPUT_INSTRUCTIONS = `
CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.
Start with { and end with }
Ensure all strings are properly escaped
Validate JSON structure before returning`;

export function buildLiteResearchPrompt(context: {
  brandVoice?: string;
  visualIdentity?: string;
  audience?: string;
  keyInsights?: string[];
  objective?: string;
  budget?: string;
  kpis?: string[];
  constraints?: string[];
  explorationCategories?: any[];
  consultationSummary?: string;
  focusAreas?: string[];
}): string {
  const {
    brandVoice,
    visualIdentity,
    audience,
    keyInsights,
    objective,
    budget,
    kpis,
    constraints,
    explorationCategories,
    consultationSummary,
    focusAreas
  } = context;

  let prompt = `Run a lightweight ideation test using the following context:\n\n`;

  // Brand Context
  prompt += `## Brand Context\n`;
  if (brandVoice) {
    prompt += `Brand Voice: ${brandVoice}\n`;
  }
  if (visualIdentity) {
    prompt += `Visual Identity: ${visualIdentity}\n`;
  }
  if (audience) {
    prompt += `Audience: ${audience}\n`;
  }
  if (keyInsights && keyInsights.length > 0) {
    prompt += `Key Insights:\n${keyInsights.map(i => `- ${i}`).join('\n')}\n`;
  }
  prompt += `\n`;

  // Strategic Objective
  prompt += `## Strategic Objective\n`;
  if (objective) {
    prompt += `${objective}\n`;
  }
  if (explorationCategories && explorationCategories.length > 0) {
    prompt += `\nExploration Focus:\n`;
    explorationCategories.forEach(cat => {
      prompt += `- ${cat.name}\n`;
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub: string) => {
          prompt += `  - ${sub}\n`;
        });
      }
    });
  }
  if (focusAreas && focusAreas.length > 0) {
    prompt += `\nResearch Focus Areas:\n`;
    prompt += `The research should emphasize these strategic angles:\n`;
    focusAreas.forEach(area => {
      prompt += `- ${area}\n`;
    });
    prompt += `\nEnsure the strategy and recommendations align with these focus areas where applicable.\n`;
  }
  if (budget) {
    prompt += `\nBudget: ${budget}\n`;
  }
  if (kpis && kpis.length > 0) {
    prompt += `KPIs: ${kpis.join(', ')}\n`;
  }
  prompt += `\n`;

  // Constraints
  if (constraints && constraints.length > 0) {
    prompt += `## Constraints\n`;
    constraints.forEach(c => {
      prompt += `- ${c}\n`;
    });
    prompt += `\n`;
  }

  // Consultation Summary
  if (consultationSummary) {
    prompt += `## Consultation Insights\n`;
    prompt += `${consultationSummary}\n\n`;
  }

  prompt += `## Task\n`;
  prompt += `Generate ONE comprehensive, well-researched strategy that:\n`;
  prompt += `1. Aligns with brand voice and positioning\n`;
  prompt += `2. Addresses the strategic objective with detailed execution plan (2-3 paragraphs minimum for core_mechanic)\n`;
  prompt += `3. Fits within budget and constraints\n`;
  prompt += `4. Includes complete TOWS analysis with FULL explanations:\n`;
  prompt += `   - SO Move: 2-3 sentences with specific data points and examples\n`;
  prompt += `   - ST Move: 2-3 sentences with specific data points and examples\n`;
  prompt += `5. Specifies detailed placements (5-10 channel/placement combinations), regional compliance, and AI use policy\n`;
  prompt += `6. Provides extensive data-backed KPIs with credible sources (aim for 10-15 sources minimum)\n`;
  prompt += `7. Includes specific examples, case studies, and actionable recommendations throughout\n`;
  prompt += `8. Uses web search extensively to find current market data, trends, and benchmarks\n`;
  prompt += `9. McKinsey 7S shared_values should be 2-3 sentences explaining alignment\n`;
  prompt += `10. Three Horizons rationale should be 2-3 sentences with specific justification\n\n`;

  prompt += `## Output Quality Standards:\n`;
  prompt += `- MINIMUM 2,500 tokens, TARGET 3,500-4,000 tokens\n`;
  prompt += `- Each strategic field (TOWS, 7S, 3H) should have substantive, detailed content\n`;
  prompt += `- DO NOT use abbreviated language or truncate explanations\n`;
  prompt += `- PROVIDE full context and reasoning for every strategic decision\n`;
  prompt += `- INCLUDE specific brand names, campaign examples, and case studies where relevant\n`;
  prompt += `- CITE data with inline references (e.g., "77% of consumers prefer X ([source.com](url))")\n\n`;

  prompt += `${LITE_RESEARCH_OUTPUT_INSTRUCTIONS}\n\n`;
  prompt += `Return ONLY the JSON object. No markdown, no code blocks, no explanations, just valid JSON.\n`;
  prompt += `IMPORTANT: Aim for comprehensive, detailed output. Do not truncate or abbreviate.`;

  return prompt;
}
