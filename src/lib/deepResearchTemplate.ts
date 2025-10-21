export const DEEP_RESEARCH_TEMPLATE = `
## Research Methodology
You have access to web search, code interpreter, and file search tools. Use them to:
- Find credible, up-to-date sources (prioritize: industry reports, case studies, academic research, regulatory filings, reputable news)
- Analyze trends, benchmarks, and competitive precedents
- Validate assumptions with data
- Support every claim with inline citations

**Source Quality Standards:**
- Prioritize sources from the last 2 years unless historical context is needed
- Prefer primary sources (company reports, research papers) over aggregators
- Include specific figures, statistics, and measurable outcomes
- Cite all sources with title, URL, publisher, and date accessed

## Objective
Produce **exactly three** differentiated strategies that:  
- Align with brand voice/positioning and target audience(s).  
- Translate insights into executable platform/partnership/program strategies.  
- Fit within stated budget, timing, and constraints.  
- Respect all guardrails (safety, privacy, cultural authenticity, disclosures).  
- Include **TOWS** mapping, **McKinsey 7S** alignment check, and **Three Horizons** classification.  
- Include **Placements & Supply Types**, **Regional Laws & Lawful Bases**, and **AI Use Policy** for each strategy (details below).

## Research Tasks
1. **Landscape scan**: relevant platforms, partners, channels, creator/educator orgs, enabling tech, credible precedents.  
2. **Opportunity mapping**: tie to audience segments, jobs-to-be-done, and emotional/functional drivers.  
3. **Differentiation**: how positioning, mechanics, and value exchange differ across the three strategies.  
4. **Feasibility & ops**: capabilities, roles, data, dependencies to launch and scale.  
5. **Measurement**: KPIs (leading/lagging), causal tests, decision rules, modeling assumptions.  
6. **Risk & compliance**: risks with mitigations; map to guardrails (privacy/FTC/cultural representation/etc.).  
7. **Framework overlays**:  
   - **TOWS matrix** — list SO, ST, WO, WT moves and the specific factors used.  
   - **McKinsey 7S** — highlight alignments/misalignments and recommended remediations.  
   - **Three Horizons** — classify initiatives/features by H1/H2/H3 with rationale.

## Cross-Channel Coverage Requirement
Ensure coverage across **all relevant digital channels** as applicable to the brief (e.g., Search, Social, Programmatic/Display, CTV/OTT, Online Video, Digital Audio/Podcasts, Retail Media, Influencer/Affiliate, Email/CRM/SMS, Web/App, SEO/ASO, Marketplaces). Where not applicable, return an empty array with a short rationale.

## Additional Required Sections (per strategy)
- **Placements & Supply Types**: enumerate \`channel → placement → supply_type\` (e.g., open exchange, PMP/PG/PD, CTV AVOD/SVOD/FAST, podcast host-read vs programmatic, Shopping vs PMax), plus any format/spec notes (durations, safe areas, tracking, file size).  
- **Regional Laws & Lawful Bases**: map regions to applicable laws (**GDPR/UK-GDPR, CCPA/CPRA, COPPA, LGPD**, etc.), the lawful basis (**consent** vs **legitimate interest**, contract, other), children handling, data minimization, and DSR processes.  
- **AI Use Policy**: where AI is used (targeting, creative, operations), disclosures, human-in-the-loop checkpoints, safety review, and prohibited uses.

## Output Contract (Strict)
- Return a **single JSON object** matching **DELIVERABLE_SCHEMA** below.  
- Provide **exactly 3** items in \`strategies[]\`.  
- **Be analytical and data-backed**: Include specific figures, trends, statistics, and measurable outcomes wherever possible.
- **Avoid generalities**: Every claim should be supported by data or credible precedent.
- **Inline citations**: Every non-dataset claim must include a citation in \`sources[]\` with inline references.
- **Budgets must reconcile** across phases; timelines must be plausible and justified.
- **KPIs must include** both **leading** and **lagging** metrics with target values where possible.
- **Experiments must include** hypothesis, primary metric, test cells, and a minimal sample/power note.
- **Tables**: Where helpful for comparison or clarity, structure data in tables (e.g., channel mix comparison, budget breakdown by phase, competitive positioning).
- **Keep prose concise and decision-useful** (no fluff).  
- If a field is not applicable, return an empty array and a **brief rationale**.

---

## DELIVERABLE_SCHEMA (return this **exact** structure)

\`\`\`json
{
  "meta": {
    "brand": "string",
    "objective": "string",
    "currency": "string",
    "assumptions": ["string"]
  },
  "strategies": [
    {
      "id": "string",
      "title": "string",
      "one_line_positioning": "string",
      "why_now": "string",
      "executive_summary": "string",

      "audience_fit": {
        "primary_segments": ["string"],
        "needs_pain_points": ["string"],
        "value_proposition": "string",
        "emotional_driver_alignment": "string"
      },

      "core_mechanics": {
        "experience_architecture": "string",
        "channel_or_platform_mechanics": ["string"],
        "narrative_or_message_device": "string",
        "education_or_authority_integration": "string",
        "sustainability_or_ethics_integration": "string",
        "example_user_journey": ["string"]
      },

      "partner_map": [
        {
          "name": "string",
          "type": "platform|engine|creator_network|publisher|educator_org|retail_media|technology|nonprofit|data_provider",
          "role": "string",
          "selection_rationale": "string"
        }
      ],

      "content_system": {
        "flagship_formats": ["string"],
        "evergreen_formats": ["string"],
        "ugc_program": "string",
        "influencer_playbook": {
          "tiers": ["micro","mid","topical_expert|edu_creator|subject_matter_expert"],
          "briefing_notes": ["string"]
        },
        "brand_voice_alignment": "string",
        "safety_filters": ["string"]
      },

      "go_to_market": {
        "channel_mix": [
          {"channel": "Retail Media|YouTube|Instagram|TikTok|Search|Email|Onsite|In-app|CTV|OOH|Events|SEO|ASO|Programmatic|Audio|Affiliate|Influencer", "role": "string"}
        ],
        "retail_or_sales_plan": "string",
        "creator_activation": "string",
        "crm_loyalty_hooks": ["string"],
        "geo_or_seasonality": ["string"]
      },

      "budget_timeline": {
        "total_budget": 0,
        "phases": [
          {"name": "string", "start": "YYYY-MM", "end": "YYYY-MM", "budget": 0, "milestones": ["string"]}
        ]
      },

      "measurement_plan": {
        "kpi_tree": {
          "awareness": ["string"],
          "engagement": ["string"],
          "consideration": ["string"],
          "conversion": ["string"],
          "retention_loyalty": ["string"],
          "brand_lift": ["string"],
          "incrementality": ["string"]
        },
        "experiments": [
          {
            "name": "string",
            "hypothesis": "string",
            "primary_metric": "string",
            "secondary_metrics": ["string"],
            "design": {
              "unit": "user|household|geo|store|device|session",
              "cells": {"control": "string", "treatment": "string"},
              "min_sample_note": "string"
            },
            "decision_rule": "string",
            "risk_checks": ["string"]
          }
        ],
        "modeling_forecasts": {
          "inputs": ["spend","reach","freq","creative_rate","retail_share","price","promo","seasonality"],
          "assumptions": ["string"],
          "scenario_notes": ["string"]
        }
      },

      "tows_matrix": {
        "strengths": ["string"],
        "weaknesses": ["string"],
        "opportunities": ["string"],
        "threats": ["string"],
        "so_strategies": ["string"],
        "st_strategies": ["string"],
        "wo_strategies": ["string"],
        "wt_strategies": ["string"]
      },

      "mckinsey_7s_alignment": {
        "strategy": "string",
        "structure": "string",
        "systems": "string",
        "shared_values": "string",
        "skills": "string",
        "style": "string",
        "staff": "string",
        "misalignment_flags": ["string"],
        "remediation_actions": ["string"]
      },

      "three_horizons": {
        "h1_now": ["string"],
        "h2_next": ["string"],
        "h3_beyond": ["string"],
        "rationale": "string"
      },

      "placements_supply": [
        {
          "channel": "Search|Social|Programmatic|CTV|Online Video|Audio|Retail Media|Influencer|Affiliate|Email|CRM|SMS|SEO|ASO|App|OOH|Events",
          "placement": "e.g., In-feed, Stories, Shorts, Display 300x250, Pre-roll, PMax, Sponsored Products, Host-read",
          "supply_type": "open_exchange|PMP|PG|PD|AVOD|SVOD|FAST|host_read|programmatic",
          "format_spec_notes": "brief spec or guardrails (durations, max file size, safe areas, tracking params)"
        }
      ],

      "regional_compliance": [
        {
          "region": "EU|UK|US-CA|US-National|BR|... ",
          "laws_applied": ["GDPR","UK-GDPR","CCPA/CPRA","COPPA","LGPD"],
          "lawful_basis": "consent|legitimate_interest|contract|other",
          "children_handling": "e.g., COPPA: no behavioral targeting; parent-directed flows only",
          "data_minimization": "what is collected, retained, and why",
          "dsr_process": "how access/erasure/opt-out requests are handled"
        }
      ],

      "ai_use_policy": {
        "areas": ["targeting","creative_generation","ops_automation","risk_scoring"],
        "disclosures": "where/how AI usage is disclosed to users/parents/partners",
        "human_in_the_loop": ["creative QA","brand safety review","audience policy checks"],
        "safety_review": ["bias checks","toxicity filters","sensitive category blocks"],
        "prohibited_uses": ["no biometric inference","no under-16 profiling","no shadow profiles"]
      },

      "risks_mitigations": [
        {"risk": "string", "likelihood": "low|med|high", "impact": "low|med|high", "mitigation": "string"}
      ],

      "compliance_alignment": {
        "disclosures": "string",
        "privacy_children_or_sensitive": "string",
        "cultural_representation": "string",
        "ai_or_automation_transparency": "string",
        "other_guardrails": ["string"]
      },

      "ops_requirements": {
        "people": ["string"],
        "process": ["string"],
        "data_access": ["string"],
        "tech_stack": ["string"],
        "dependencies": ["string"]
      },

      "success_criteria": {
        "12_week": ["string"],
        "6_month": ["string"],
        "12_month": ["string"]
      },

      "sources": [
        {"title": "string", "url": "string", "publisher": "string", "date_accessed": "YYYY-MM-DD"}
      ]
    }
  ]
}
\`\`\`

## Constraints
- **Use and cite only reputable sources** for external claims (industry reports, academic research, regulatory filings, company earnings, reputable news).
- **Respect any guardrails** present in \`context_pack_json\`.  
- **Prefer contextual/parent-directed approaches** where applicable (especially for children/family audiences).
- **Keep each strategy self-contained and non-overlapping** with clear differentiation.
- **Ground all recommendations in data**: Use web search to find benchmarks, case studies, and market data that support your strategic recommendations.
- **Validate feasibility**: Use code interpreter if needed to analyze budgets, model scenarios, or calculate projections.
- **Return only the JSON object** matching the schema. No extra text, no chain-of-thought, no preamble.

## Example Research Approach
1. **Search for competitive precedents** in the relevant category/vertical
2. **Find benchmark data** for channel performance, engagement rates, conversion metrics
3. **Identify regulatory requirements** for the target regions and audience
4. **Analyze budget allocation** patterns from similar campaigns
5. **Validate partner/platform capabilities** through recent case studies or reports
6. **Support all claims** with inline citations to credible sources
`;

