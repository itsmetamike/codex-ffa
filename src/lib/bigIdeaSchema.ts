export const BIG_IDEA_SCHEMA = `
## Phase 2: Structure Big Idea Research into JSON

You have been provided with comprehensive research about a single marketing execution idea. Your task is to extract and structure ALL the key details into the JSON format below.

**IMPORTANT**: 
- Extract EVERY detail mentioned in the research
- Include all specific numbers, costs, names, and tactical details
- Do not summarize or simplify - be comprehensive
- Fill out every field that has information in the research
- If a field has no information, use empty string or empty array

Return a single JSON object with this structure:

\`\`\`json
{
  "meta": {
    "brand": "string",
    "objective": "string",
    "currency": "string",
    "budget": 200000
  },
  "big_idea": {
    "title": "string - catchy name for the big idea",
    "one_line_pitch": "string - elevator pitch",
    "concept_overview": "string - 2-3 paragraph description of the core concept",
    "why_now": "string - cultural/market timing rationale with data",
    
    "audience_fit": {
      "primary_segments": ["string"],
      "psychographics": "string - deep dive into motivations, behaviors",
      "value_proposition": "string"
    },
    
    "execution_details": {
      "core_mechanic": "string - how it works",
      "activation_tactics": ["string - specific tactical elements"],
      "content_formats": ["string - specific content types"],
      "platform_strategy": ["string - which platforms and why"],
      "partner_requirements": [
        {"name": "string", "role": "string", "rationale": "string"}
      ]
    },
    
    "media_mix": {
      "channels": [
        {
          "channel": "string",
          "budget_allocation": 0,
          "budget_percentage": 0,
          "role": "string",
          "kpis": ["string"]
        }
      ],
      "total_budget": 200000,
      "budget_rationale": "string - why this allocation"
    },
    
    "timing_flighting": {
      "launch_window": "string - when and why",
      "phases": [
        {
          "name": "string",
          "start": "YYYY-MM",
          "end": "YYYY-MM",
          "budget": 0,
          "key_activities": ["string"],
          "milestones": ["string"]
        }
      ],
      "seasonal_considerations": ["string"]
    },
    
    "viral_mechanics": {
      "shareability_drivers": ["string - what makes this spread"],
      "ugc_strategy": "string - how to encourage user content",
      "challenge_mechanics": "string - if applicable",
      "community_building": "string - how to build ongoing engagement"
    },
    
    "measurement": {
      "leading_indicators": [
        {"metric": "string", "target": "string", "tracking": "string"}
      ],
      "lagging_indicators": [
        {"metric": "string", "target": "string", "tracking": "string"}
      ],
      "attribution_approach": "string",
      "success_criteria": {
        "12_week": ["string"],
        "6_month": ["string"],
        "12_month": ["string"]
      }
    },
    
    "proof_points": {
      "precedents": [
        {
          "example": "string - similar campaign/activation",
          "results": "string - specific outcomes",
          "learnings": "string - what we can apply"
        }
      ],
      "benchmarks": [
        {"metric": "string", "industry_benchmark": "string", "our_target": "string"}
      ]
    },
    
    "risks_mitigations": [
      {
        "risk": "string",
        "likelihood": "low|med|high",
        "impact": "low|med|high",
        "mitigation": "string"
      }
    ],
    
    "competitive_differentiation": "string - how this differs from competitors",
    
    "ops_requirements": {
      "people": ["string - roles needed"],
      "tech_stack": ["string - tools/platforms"],
      "dependencies": ["string - what needs to be in place"],
      "timeline_to_launch": "string"
    },
    
    "sources": [
      {
        "title": "string",
        "url": "string",
        "publisher": "string",
        "date_accessed": "YYYY-MM-DD",
        "key_insight": "string - what we learned from this source"
      }
    ]
  }
}
\`\`\`

## Instructions for Structuring

- Extract ALL key details from the research
- Include specific numbers, costs, timings, and names wherever mentioned
- Preserve tactical specifics (exact budget breakdowns, named partners, precise timing)
- Maintain data-backed claims with inline references
- If research mentions specific influencers, platforms, or vendors, include them by name
- Budget allocations must add up to total budget
- Be comprehensive - don't summarize away important details
`;
