# Lite Research - Cost-Effective Strategy Generation

## Overview

**Lite Research** is a fast, affordable alternative to Full Deep Research that generates a single well-researched strategy using `gpt-4o-mini` instead of `o3-deep-research`.

## Cost Comparison

| Feature | Lite Research | Full Deep Research |
|---------|--------------|-------------------|
| **Model** | gpt-4o-mini | o3-deep-research |
| **Cost** | ~$0.05-0.50 | $10-100+ |
| **Time** | 5-15 seconds | 10-30 minutes |
| **Strategies** | 1 strategy | 3 strategies |
| **Research Depth** | Focused | Comprehensive |
| **Tool Calls** | 0 (no web search) | 20-100+ |
| **Output** | ~600-800 tokens | 2,000-10,000+ tokens |
| **Best For** | Quick ideation, budget-conscious | Deep analysis, high-stakes campaigns |

## When to Use Lite Research

✅ **Use Lite Research when:**
- You need quick strategic direction
- Budget is limited
- You want to test multiple approaches cheaply
- You have good context already
- You need one solid strategy fast

❌ **Use Full Deep Research when:**
- You need comprehensive analysis
- Budget allows for deep research
- You want multiple differentiated strategies
- You need extensive web research
- Stakes are high (major campaign launch)

## What You Get

### Lite Research Output

```json
{
  "meta": {
    "brand": "PlayNova",
    "objective": "Influencer partnerships",
    "currency": "USD"
  },
  "strategy": {
    "title": "Micro-Influencer STEM Storytelling Network",
    "one_line_positioning": "Authentic parent-educator partnerships...",
    "core_mechanic": "Monthly co-creation challenges...",
    "channel_mix": ["Instagram", "YouTube", "TikTok"],
    "tows": {
      "so_move": "Leverage brand warmth + micro-influencer authenticity",
      "st_move": "Counter macro-influencer fatigue with genuine stories"
    },
    "mckinsey_7s": {
      "shared_values": "Creativity, education, family bonding",
      "misalignment_flag": "May need influencer vetting process"
    },
    "three_horizons": {
      "horizon": "H1",
      "rationale": "Proven channel, immediate ROI potential"
    },
    "placements_supply": [...],
    "regional_compliance": [...],
    "ai_use_policy": {...},
    "kpis": ["Engagement rate +30%", "Social growth +20%"],
    "sources": [...]
  }
}
```

### Full Deep Research Output

- 3 differentiated strategies
- Extensive TOWS matrices
- Detailed McKinsey 7S analysis
- Comprehensive Three Horizons breakdown
- 10-50+ web search citations
- Code interpreter analysis
- 2,000-10,000 word report

## How It Works

### Architecture

```
User Input
    ↓
Lite Research Prompt Builder
    ↓
gpt-4o-mini (JSON mode)
    ↓
Single Strategy (600-800 tokens)
    ↓
Saved to Database
    ↓
Display in UI
```

### No Background Processing

Unlike Full Deep Research:
- ✅ **Instant results** (5-15 seconds)
- ✅ **No polling** required
- ✅ **No timeout** issues
- ✅ **Synchronous** API call

### Prompt Structure

```
System: You are a Strategic Researcher...
Output must follow DELIVERABLE_SCHEMA_LITE exactly.

User: Run a lightweight ideation test for [Brand]...
- Brand Context
- Strategic Objective
- Constraints
- Consultation Insights

Return ONLY valid JSON.
```

## Setup

### Already Configured!

Lite Research is ready to use out of the box:
- ✅ Uses existing `gpt-4o-mini` model
- ✅ No additional API keys needed
- ✅ No database migrations required
- ✅ Works with existing context

### API Endpoint

**POST** `/api/deep-research/lite`

**Request:**
```json
{
  "sessionId": "your_session_id"
}
```

**Response:**
```json
{
  "success": true,
  "result": { /* strategy object */ },
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 750,
    "totalTokens": 2250
  }
}
```

## UI Usage

### Step 1: Generate Research Context

Complete the consultation chat and click **"Generate Research Context"**.

### Step 2: Choose Research Mode

You'll see two options:

**🔵 Lite Research (Recommended)**
- Fast, cost-effective (~$0.05-0.50)
- Single strategy with frameworks
- Uses gpt-4o-mini

**🟣 Full Deep Research**
- Comprehensive, expensive ($10-100+)
- 3 strategies, extensive research
- Uses o3-deep-research

### Step 3: Start Research

Click the button (blue for Lite, purple for Full).

### Step 4: View Results

**Lite Research** displays immediately with:
- Strategy title & positioning
- Core mechanic
- Channel mix
- TOWS analysis
- McKinsey 7S alignment
- Three Horizons classification
- KPIs
- Sources (if any)
- Compliance notes
- AI use policy

## Cost Breakdown

### Lite Research (~$0.05-0.50)

**Input:**
- Prompt: ~1,500-2,000 tokens
- Rate: $0.150 per 1M tokens
- Cost: ~$0.0003

**Output:**
- Response: ~600-800 tokens
- Rate: $0.600 per 1M tokens
- Cost: ~$0.0005

**Total: ~$0.0008 (less than 1 cent!)**

*Note: Actual cost may be slightly higher depending on context size*

### Full Deep Research ($10-100+)

**Input:**
- Prompt: ~20,000-30,000 tokens
- Rate: Varies by model
- Cost: ~$5-20

**Output:**
- Response: ~10,000-50,000 tokens
- Tool calls: 20-100+ searches
- Rate: Premium pricing
- Cost: ~$5-80+

**Total: $10-100+ depending on complexity**

## Limitations

### What Lite Research Doesn't Do

❌ **No web search** - Uses only provided context
❌ **No code interpreter** - No data analysis
❌ **No file search** - Doesn't access vector stores
❌ **Single strategy** - Not multiple options
❌ **Less depth** - Focused, not comprehensive
❌ **No background mode** - Must complete in one call

### Workarounds

**Need web research?**
- Use Full Deep Research instead
- Or manually research and add to consultation chat

**Need multiple strategies?**
- Run Lite Research multiple times with different focus
- Or use Full Deep Research

**Need data analysis?**
- Provide data in consultation chat
- Or use Full Deep Research with code interpreter

## Best Practices

### 1. Provide Good Context

Lite Research relies on your input. Make sure to:
- Complete the consultation chat thoroughly
- Be specific about objectives
- Include key insights
- Mention constraints

### 2. Use for Iteration

Lite Research is perfect for:
- Testing different angles quickly
- Refining your approach
- Getting quick validation
- Budget-conscious exploration

### 3. Upgrade When Needed

Start with Lite, upgrade to Full when:
- You've validated the direction
- You need comprehensive analysis
- Budget allows
- Stakes are high

## Troubleshooting

### Issue: "No response from model"

**Cause**: API error or timeout

**Solution**: Try again, check API key

### Issue: "Model returned invalid JSON"

**Cause**: Model didn't follow schema

**Solution**: This is rare with gpt-4o-mini's JSON mode. Try again.

### Issue: Results seem generic

**Cause**: Insufficient context provided

**Solution**: 
- Add more detail in consultation chat
- Be specific about brand voice
- Include more constraints
- Or use Full Deep Research for web-researched insights

### Issue: Missing sources

**Cause**: Lite Research doesn't do web search

**Solution**:
- Sources are based on provided context only
- For real citations, use Full Deep Research
- Or manually add sources to consultation

## Examples

### Example 1: Quick Influencer Strategy

**Input**: PlayNova, $150K budget, influencer focus

**Output**: Single micro-influencer strategy with TOWS, 7S, H1 classification

**Time**: 8 seconds

**Cost**: $0.12

### Example 2: Budget-Conscious Campaign

**Input**: Startup, limited budget, need direction

**Output**: Focused strategy with clear KPIs and compliance notes

**Time**: 6 seconds

**Cost**: $0.08

### Example 3: Rapid Iteration

**Input**: Testing 3 different channel approaches

**Output**: Run Lite Research 3 times with different focus

**Time**: 24 seconds total

**Cost**: $0.36 total (vs $50+ for Full Deep Research)

## Migration Path

### From Lite to Full

If you start with Lite Research and want to upgrade:

1. Review Lite Research output
2. Refine consultation based on insights
3. Switch to "Full Deep Research" mode
4. Run comprehensive analysis
5. Compare results

### Cost-Effective Workflow

```
Lite Research ($0.10)
    ↓
Review & Refine
    ↓
Lite Research v2 ($0.10)
    ↓
Validate Direction
    ↓
Full Deep Research ($50)
    ↓
Final Strategy
```

**Total**: $50.20 (vs $150 for 3x Full Deep Research)

## Summary

**Lite Research** is perfect for:
- ✅ Quick strategic direction
- ✅ Budget-conscious teams
- ✅ Rapid iteration
- ✅ Testing approaches
- ✅ Early-stage ideation

**Full Deep Research** is better for:
- ✅ Comprehensive analysis
- ✅ High-stakes campaigns
- ✅ Multiple strategies
- ✅ Web-researched insights
- ✅ Data-backed decisions

**Choose based on your needs, budget, and timeline!**

---

## Quick Reference

| Metric | Lite | Full |
|--------|------|------|
| Cost | $0.05-0.50 | $10-100+ |
| Time | 5-15 sec | 10-30 min |
| Model | gpt-4o-mini | o3-deep-research |
| Strategies | 1 | 3 |
| Web Search | ❌ | ✅ |
| Code Analysis | ❌ | ✅ |
| File Search | ❌ | ✅ |
| Best For | Quick ideation | Deep analysis |
