export const DEEP_RESEARCH_STRATEGY_TEMPLATE = `
## Deep Research: Comprehensive Strategic Analysis

You have access to web search, code interpreter, and file search tools. Use them extensively to conduct thorough research.

## Research Methodology
- Find credible, up-to-date sources (prioritize: industry reports, case studies, academic research, regulatory filings, reputable news)
- Analyze trends, benchmarks, and competitive precedents
- Validate assumptions with data
- Support every claim with inline citations
- Dig deep into nuances, edge cases, and contextual factors
- Prioritize sources from the last 2 years unless historical context is needed
- Prefer primary sources (company reports, research papers) over aggregators
- Include specific figures, statistics, and measurable outcomes

## Objective
Conduct comprehensive research to inform **exactly three** differentiated strategies that:
- Align with brand voice/positioning and target audience(s)
- Translate insights into executable platform/partnership/program strategies
- Fit within stated budget, timing, and constraints
- Respect all guardrails (safety, privacy, cultural authenticity, disclosures)

## Research Areas
1. **Landscape scan**: relevant platforms, partners, channels, creator/educator orgs, enabling tech, credible precedents
2. **Opportunity mapping**: tie to audience segments, jobs-to-be-done, and emotional/functional drivers
3. **Differentiation**: how positioning, mechanics, and value exchange differ across the three strategies
4. **Feasibility & ops**: capabilities, roles, data, dependencies to launch and scale
5. **Measurement**: KPIs (leading/lagging), causal tests, decision rules, modeling assumptions
6. **Risk & compliance**: risks with mitigations; map to guardrails (privacy/FTC/cultural representation/etc.)
7. **Framework overlays**: TOWS matrix, McKinsey 7S alignment, Three Horizons classification

## Instructions
Provide comprehensive research findings and strategic recommendations. Be thorough and analytical.

**Be data-backed**: Include specific figures, trends, statistics, and measurable outcomes wherever possible.
**Avoid generalities**: Every claim should be supported by data or credible precedent.
**Show your work**: Include detailed analysis, comparisons, and evidence.
**Cite sources**: Reference all sources with title, URL, publisher, and date.
`;

export const DEEP_RESEARCH_BIG_IDEA_TEMPLATE = `
## Deep Research: Big Idea Development

You have access to web search, code interpreter, and file search tools. Use them extensively to conduct thorough research.

## Research Methodology
- Find credible, up-to-date sources (prioritize: industry reports, case studies, academic research, competitive campaigns, cultural trends)
- Analyze successful precedents, viral mechanics, and audience behaviors
- Validate assumptions with data and real-world examples
- Support every claim with inline citations
- Dig deep into execution details, budgets, and tactical specifics
- Prioritize sources from the last 2 years unless historical context is needed
- Include specific figures, statistics, costs, and measurable outcomes

## Objective
Develop **ONE comprehensive, novel marketing execution idea** that:
- Aligns with brand voice/positioning and target audience
- Taps into cultural moments, trends, or insights
- Provides intricate tactical and execution details
- Fits within stated budget, timing, and constraints
- Respects all guardrails (safety, privacy, cultural authenticity, disclosures)
- Is differentiated from competitive approaches

## Research Areas
1. **Landscape scan**: Trending formats, cultural moments, viral mechanics, competitive landscape, emerging platforms/channels, successful precedents
2. **Audience deep-dive**: Psychographics, behaviors, content consumption patterns, decision drivers, emotional triggers, communities
3. **Big Idea concept**: The novel hook/approach with clear rationale for why it will resonate and spread
4. **Cultural hooks**: Specific trends, moments, conversations, or cultural tensions to tap into with timing considerations
5. **Execution details**: Specific tactics, creative approach, activation mechanics, content formats, platform strategies, partner/vendor requirements
6. **Media mix & budget allocation**: Channel-by-channel breakdown with exact dollar amounts, CPMs, reach estimates, and rationale
7. **Timing & flighting**: Launch windows, content calendar, seasonal considerations, pacing strategy, key milestones
8. **Viral/shareability mechanics**: What makes this spread organically, shareability drivers, amplification strategy
9. **Measurement framework**: KPIs (leading/lagging), attribution model, success metrics, optimization triggers, reporting cadence
10. **Risk & compliance**: Risks with mitigations, regulatory considerations, brand safety, crisis scenarios
11. **Proof points & precedents**: Case studies, benchmarks, similar executions with results, cost comparisons
12. **Competitive differentiation**: How this differs from competitor approaches, white space analysis, novelty factors

## Instructions
Provide comprehensive research and a fully-developed big idea with intricate execution details. Be specific and tactical.

**Be hyper-specific**: Include named partners, exact budget figures, specific content formats, precise timing, real examples.
**Be data-backed**: Include costs, reach estimates, engagement benchmarks, conversion rates, ROI projections.
**Show precedents**: Reference similar successful campaigns with specific results and learnings.
**Be tactical**: Provide execution-ready details, not high-level concepts.
**Cite sources**: Reference all sources with title, URL, publisher, and date.
`;

// Default export for backward compatibility
export const DEEP_RESEARCH_PHASE1_TEMPLATE = DEEP_RESEARCH_STRATEGY_TEMPLATE;
