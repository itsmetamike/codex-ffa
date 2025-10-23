# AI Model Usage Documentation

This document provides a comprehensive overview of all AI models used throughout the Magentic application, where they're used, and how to configure them.

## Model Configuration

All models can be configured via environment variables in your `.env` file. See `.env.example` for the complete configuration template.

## Models Overview

### 1. INTENT_MODEL
**Default:** `gpt-4o-mini`  
**Purpose:** Fast, structured data extraction and parsing tasks  
**Cost Profile:** Low cost, high speed

#### Usage Locations:
- **`/api/parse-brief`** - Parse marketing briefs into structured JSON
- **`/api/merge-brief`** - Merge user answers into existing brief structure  
- **`/api/analyze-brief`** - Analyze briefs and generate strategic questions
- **`/app/brief/actions.ts`** - Brief parsing server actions

#### When Used in Workflow:
- **Step 2 (Brief Parsing)**: Parses raw text briefs into structured data, analyzes for missing information, and generates strategic questions

---

### 2. SYNTHESIS_MODEL
**Default:** `gpt-4o`  
**Purpose:** Complex synthesis and analysis requiring deep reasoning  
**Cost Profile:** Medium-high cost, high quality

#### Usage Locations:
- **`/app/context/actions.ts`** - Build context packs from vector store documents
- **`/app/workflow/actions.ts`** - Extract guardrails from brand documents
- **`/api/consultation-chat`** (extract-topic action) - Extract research topics from conversations

#### When Used in Workflow:
- **Step 1 (Context Builder)**: Synthesizes multiple brand documents into unified context packs
- **Step 3 (Workflow Orchestration)**: Extracts brand safety guardrails from documents
- **Step 4 (Pre-Research Consultation)**: Extracts single research topics from consultation conversations

---

### 3. CREATIVE_MODEL
**Default:** `gpt-4o`  
**Purpose:** Creative content generation and strategic ideation  
**Cost Profile:** Medium-high cost, high quality

#### Usage Locations:
- **`/api/ideate-answer`** - Generate strategic answers to brief questions (Q&A "Ideate" button)
- **`/api/ideate-brief`** - Generate sample marketing briefs
- **`/api/explore-categories`** - Generate strategic exploration categories
- **`/api/consultation-chat`** (initiate & chat actions) - Pre-research consultation conversations

#### When Used in Workflow:
- **Step 2 (Brief Parsing)**: 
  - "Ideate" button on main brief input - generates sample marketing briefs
  - "Ideate" button in Q&A section - generates strategic answers to questions
- **Step 3 (Workflow Orchestration)**: Generates exploration categories and subcategories
- **Step 4 (Pre-Research Consultation)**: Powers the entire consultation chat interface

---

### 4. SCORING_MODEL
**Default:** `gpt-4o-mini`  
**Purpose:** Evaluation and scoring tasks  
**Status:** ⚠️ Currently defined but not actively used in the codebase

#### Potential Future Uses:
- Scoring campaign ideas
- Evaluating brief quality
- Rating strategic alignment

---

### 5. REASONING_MODEL
**Default:** `o1-preview`  
**Purpose:** Advanced reasoning tasks requiring chain-of-thought  
**Status:** ⚠️ Currently defined but not actively used in the codebase

#### Potential Future Uses:
- Complex strategic analysis
- Multi-step reasoning tasks
- Advanced problem-solving

---

### 6. EMBEDDING_MODEL
**Default:** `text-embedding-3-large`  
**Purpose:** Vector embeddings for semantic search  
**Status:** ⚠️ Currently defined but not actively used in the codebase

**Note:** Vector search is currently handled by OpenAI's `file_search` tool with vector stores, which manages embeddings automatically.

#### Potential Future Uses:
- Custom semantic search implementations
- Document similarity analysis
- Clustering and classification

---

### 7. DEEP_RESEARCH_MODEL
**Default:** `o3-deep-research`  
**Purpose:** Deep research tasks with extended reasoning and web search  
**Cost Profile:** High cost, very high quality, extended processing time

#### Usage Locations:
- **`/api/deep-research/start`** - Start deep research jobs
- **`/api/deep-research/test`** - Test deep research API access

#### When Used in Workflow:
- **Step 5 (Deep Research)**: Conducts comprehensive research with web search, data validation, and extended reasoning

---

## Workflow Step Summary

### Step 1: Context Builder
- **SYNTHESIS_MODEL**: Builds context packs from uploaded brand documents

### Step 2: Brief Parsing
- **INTENT_MODEL**: Parses briefs and generates strategic questions
- **CREATIVE_MODEL**: Generates sample briefs and strategic answers

### Step 3: Workflow Orchestration
- **SYNTHESIS_MODEL**: Extracts brand safety guardrails
- **CREATIVE_MODEL**: Generates exploration categories

### Step 4: Pre-Research Consultation
- **CREATIVE_MODEL**: Powers consultation conversations
- **SYNTHESIS_MODEL**: Extracts research topics

### Step 5: Deep Research
- **DEEP_RESEARCH_MODEL**: Conducts comprehensive research

---

## Cost Optimization Strategies

### Budget-Conscious Setup (Lowest Cost)
```env
INTENT_MODEL=gpt-4o-mini
SYNTHESIS_MODEL=gpt-4o-mini
CREATIVE_MODEL=gpt-4o-mini
DEEP_RESEARCH_MODEL=gpt-4o
```
**Trade-offs:**
- Lower quality synthesis and creative outputs
- Faster response times
- Significantly reduced costs
- May miss nuances in brand documents

### Balanced Setup (Recommended)
```env
INTENT_MODEL=gpt-4o-mini
SYNTHESIS_MODEL=gpt-4o
CREATIVE_MODEL=gpt-4o
DEEP_RESEARCH_MODEL=o3-deep-research
```
**Trade-offs:**
- Good balance of quality and cost
- Fast parsing, high-quality synthesis
- Optimal for most use cases

### Premium Setup (Highest Quality)
```env
INTENT_MODEL=gpt-4o
SYNTHESIS_MODEL=gpt-4o
CREATIVE_MODEL=gpt-4o
DEEP_RESEARCH_MODEL=o3-deep-research
```
**Trade-offs:**
- Best possible quality across all tasks
- Higher costs
- Slightly slower parsing
- Recommended for production/client work

### Targeted Optimization
You can also optimize specific workflows:

**Optimize Brief Parsing Speed:**
```env
INTENT_MODEL=gpt-4o-mini  # Keep fast
CREATIVE_MODEL=gpt-4o     # Keep quality for ideation
```

**Optimize Context Building:**
```env
SYNTHESIS_MODEL=gpt-4o-mini  # Reduce cost
```

**Optimize Research Quality:**
```env
DEEP_RESEARCH_MODEL=o3-deep-research  # Maximum quality
```

---

## Model Selection Guidelines

### When to Use gpt-4o-mini:
- ✅ Structured data extraction
- ✅ JSON parsing
- ✅ Fast iterations during development
- ✅ High-volume, low-complexity tasks

### When to Use gpt-4o:
- ✅ Creative content generation
- ✅ Complex synthesis tasks
- ✅ Strategic analysis
- ✅ Brand-sensitive content
- ✅ Production environments

### When to Use o3-deep-research:
- ✅ Comprehensive research requiring web search
- ✅ Tasks requiring extended reasoning
- ✅ High-stakes strategic decisions
- ✅ When accuracy is critical

### When to Use o1-preview (Future):
- ✅ Multi-step reasoning problems
- ✅ Complex strategic planning
- ✅ Advanced problem-solving

---

## Testing Model Changes

To test different model configurations:

1. **Update your `.env` file:**
   ```env
   CREATIVE_MODEL=gpt-4o-mini
   ```

2. **Restart your development server:**
   ```bash
   npm run dev
   ```

3. **Test the affected workflows:**
   - For CREATIVE_MODEL changes: Test Step 2 (Brief Parsing) Ideate buttons
   - For SYNTHESIS_MODEL changes: Test Step 1 (Context Builder)
   - For INTENT_MODEL changes: Test Step 2 (Brief Parsing)

4. **Monitor quality and cost:**
   - Check OpenAI usage dashboard for cost impact
   - Evaluate output quality for your use case

---

## Future Model Additions

The model configuration system is designed to be extensible. To add new models:

1. **Update `/src/config/models.ts`:**
   ```typescript
   export type ModelKey =
     | "INTENT_MODEL"
     | "YOUR_NEW_MODEL"
     // ...
   
   const DEFAULT_MODELS: ModelConfig = {
     YOUR_NEW_MODEL: "gpt-4o",
     // ...
   };
   ```

2. **Use in your code:**
   ```typescript
   import { getModel } from "@/config/models";
   
   const model = getModel("YOUR_NEW_MODEL");
   ```

3. **Document in `.env.example`**

---

## Troubleshooting

### Model Not Found Error
**Error:** `Model 'xyz' not found`  
**Solution:** Check that the model name in your `.env` matches OpenAI's available models

### Rate Limiting
**Error:** `Rate limit exceeded`  
**Solution:** Consider switching to gpt-4o-mini for high-volume tasks

### Quality Issues
**Problem:** Outputs are lower quality than expected  
**Solution:** Upgrade to gpt-4o for the affected model type

### Cost Concerns
**Problem:** OpenAI costs are too high  
**Solution:** Follow the "Budget-Conscious Setup" configuration above

---

## Additional Resources

- [OpenAI Model Documentation](https://platform.openai.com/docs/models)
- [OpenAI Pricing](https://openai.com/pricing)
- [Model Configuration Code](/src/config/models.ts)
- [Environment Variables Example](/.env.example)
