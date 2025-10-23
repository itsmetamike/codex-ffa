# Pricing Comparison - Research Options

## Model Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **o4-mini-deep-research** | $2.00 | $8.00 |
| **o3-deep-research** | $2.00 | $8.00 |
| **gpt-4o-mini** | $0.15 | $0.60 |

## Research Options

### Option 1: Lite Research (No Web Search)
**Model**: o4-mini-deep-research (Responses API, no tools)

**Cost Breakdown:**
- Input: ~2,000 tokens × $2.00 / 1M = **$0.004**
- Output: ~800 tokens × $8.00 / 1M = **$0.0064**
- **Total: ~$0.01 per run**

**Features:**
- ✅ Uses provided context only
- ✅ Structured JSON output
- ✅ TOWS, 7S, Three Horizons
- ✅ Fast (5-15 seconds)
- ❌ No web search
- ❌ No code interpreter

### Option 2: Lite Research + Web Search
**Model**: o4-mini-deep-research (Responses API with web_search_preview)

**Cost Breakdown:**
- Input: ~2,000 tokens × $2.00 / 1M = **$0.004**
- Output: ~800 tokens × $8.00 / 1M = **$0.0064**
- Web searches: ~5-10 searches
- **Total: ~$0.50-2.00 per run** (depending on search depth)

**Features:**
- ✅ Web search for current data
- ✅ Structured JSON output
- ✅ TOWS, 7S, Three Horizons
- ✅ Faster than o3 (1-3 minutes)
- ✅ Data-backed insights
- ❌ No code interpreter

### Option 3: Full Deep Research
**Model**: o3-deep-research (Responses API with all tools)

**Cost Breakdown:**
- Input: ~20,000-30,000 tokens × $2.00 / 1M = **$0.04-0.06**
- Output: ~10,000-50,000 tokens × $8.00 / 1M = **$0.08-0.40**
- Web searches: ~20-100+ searches
- Code interpreter: ~5-20 runs
- **Total: ~$10-100+ per run**

**Features:**
- ✅ Extensive web search
- ✅ Code interpreter for analysis
- ✅ File search (if vector store)
- ✅ 3 comprehensive strategies
- ✅ 2,000-10,000 word report
- ❌ Slow (10-30 minutes)
- ❌ Very expensive

## Cost Comparison Table

| Option | Cost | Time | Web Search | Strategies | Best For |
|--------|------|------|------------|-----------|----------|
| **Lite (No Web)** | **$0.01** | 5-15 sec | ❌ | 1 | Quick ideation, good context |
| **Lite + Web** | **$0.50-2.00** | 1-3 min | ✅ | 1 | Current data, budget-conscious |
| **Full Deep** | **$10-100+** | 10-30 min | ✅✅✅ | 3 | Comprehensive, high-stakes |

## Savings Analysis

### Your Previous Run (Full Deep Research)
- Cost: ~$50-100
- Time: 30 minutes
- Hit quota

### Same Task with Lite + Web Search
- Cost: ~$1-2
- Time: 2-3 minutes
- **Savings: 95-98%**

### Same Task with Lite (No Web)
- Cost: ~$0.01
- Time: 10 seconds
- **Savings: 99.99%**

## Recommended Strategy

### For Budget-Conscious Users:

```
1. Lite (No Web) - $0.01
   ↓ Review
2. Lite (No Web) v2 - $0.01
   ↓ Validate
3. Lite + Web Search - $1.00
   ↓ Final validation
Total: $1.02
```

### For Quality-Focused Users:

```
1. Lite + Web Search - $1.00
   ↓ Review
2. Lite + Web Search v2 - $1.00
   ↓ Validate
3. Full Deep Research - $50.00
   ↓ Final comprehensive report
Total: $52.00 (vs $150 for 3x Full)
```

### For Maximum Speed:

```
1. Lite (No Web) - $0.01
   ↓ 10 seconds
2. Done!
```

## Web Search Cost Factors

Web search cost depends on:
- **Number of searches**: 5-10 for Lite, 20-100+ for Full
- **Pages opened**: Each page adds tokens
- **Search depth**: More searches = more cost

**Lite + Web Search** is configured to:
- Limit searches to 5-10
- Focus on most relevant results
- Keep output concise
- **Target cost: $0.50-2.00**

## When to Use Each Option

### Use Lite (No Web Search) When:
✅ You have good context already
✅ Budget is extremely tight
✅ Need instant results
✅ Testing multiple approaches
✅ Early ideation phase

### Use Lite + Web Search When:
✅ Need current market data
✅ Want data-backed insights
✅ Budget allows $1-2 per run
✅ Context is incomplete
✅ Need credible sources

### Use Full Deep Research When:
✅ High-stakes campaign
✅ Need 3 strategies
✅ Want comprehensive analysis
✅ Budget allows $50-100
✅ Time is not critical

## Cost Per Strategy Comparison

| Option | Cost per Strategy | Quality | Time |
|--------|------------------|---------|------|
| Lite (No Web) | **$0.01** | Good | 10 sec |
| Lite + Web | **$1.00** | Better | 2 min |
| Full Deep | **$33** (3 strategies) | Best | 30 min |

## Break-Even Analysis

**If you need 3 strategies:**

**Option A: 3x Lite + Web**
- Cost: 3 × $1.00 = **$3.00**
- Time: 3 × 2 min = **6 minutes**
- Output: 3 separate strategies

**Option B: 1x Full Deep**
- Cost: **$50.00**
- Time: **30 minutes**
- Output: 3 integrated strategies

**Savings with Option A: $47 (94%)**

## Monthly Budget Scenarios

### $10/month Budget
- **100x** Lite (No Web) runs
- **OR 5-10x** Lite + Web runs
- **OR 0.2x** Full Deep runs (can't afford one!)

### $50/month Budget
- **500x** Lite (No Web) runs
- **OR 25-50x** Lite + Web runs
- **OR 1x** Full Deep run

### $100/month Budget
- **1,000x** Lite (No Web) runs
- **OR 50-100x** Lite + Web runs
- **OR 2x** Full Deep runs

## Recommendation

Based on your quota issue:

1. **Default to Lite + Web Search** ($1-2 per run)
   - 95-98% cheaper than Full Deep
   - Still gets current data
   - Fast enough (2-3 min)

2. **Use Lite (No Web)** for rapid iteration ($0.01 per run)
   - Test multiple angles
   - Refine approach
   - Validate direction

3. **Reserve Full Deep** for final deliverables ($50-100 per run)
   - Only when absolutely needed
   - High-stakes campaigns
   - Client presentations

**This strategy gives you 50-100 research runs per month instead of 1-2!**
