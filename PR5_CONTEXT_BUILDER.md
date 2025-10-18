# PR 5 — Context Builder (file_search)

## Overview
This PR implements the Context Builder feature that retrieves and synthesizes all relevant internal brand intelligence into a unified Context Pack — structured summaries from your vector store filtered by the expanded taxonomy.

**IMPORTANT:** Context Builder has been moved to **Step 2** in the workflow (after Document Ingestion, before Brief Parsing) to establish the brand context foundation before parsing campaign briefs.

## Implementation Details

### 1. Database Schema (`prisma/schema.prisma`)
- Added `ContextPack` model to store synthesized brand intelligence
- Added relation to `Session` model
- Fields include:
  - `brandVoice`: Brand voice and tone guidelines
  - `visualIdentity`: Visual identity and brand kit guidelines
  - `audienceSummary`: Target audience and personas
  - `keyInsights`: Performance and analytics insights (JSON array)
  - `creativeLessons`: Creative best practices and lessons (JSON array)
  - `strategyHighlights`: Strategy and planning highlights (JSON array)
  - `budgetNotes`: Budget allocation notes (optional)
  - `risksOrCautions`: Risks and cautions (JSON array)
  - `sources`: File citations (JSON array)

### 2. Schema & Types (`src/lib/schemas.ts`)
- Added `ContextPackSchema` Zod schema for validation
- Added `ContextPack` TypeScript type

### 3. Server Action (`src/app/workflow/actions.ts`)
- Implemented `buildContextPackAction` function
- Uses OpenAI Assistants API with `file_search` tool
- Queries across document type categories:
  - **Brand & Identity**: BRAND_VOICE, BRAND_KIT, BRAND_GUIDELINES, BRAND_SAFETY_GUIDELINES, VISUAL_IDENTITY, TONE_OF_VOICE
  - **Audience & Personas**: PERSONA, AUDIENCE_INSIGHTS, CUSTOMER_RESEARCH, SEGMENTATION_STUDY
  - **Performance & Analytics**: MMM_RESULT, CAMPAIGN_PERFORMANCE, ATTRIBUTION_ANALYSIS, MARKET_RESEARCH, COMPETITIVE_ANALYSIS
  - **Creative & Content**: CREATIVE_BEST_PRACTICES, CREATIVE_LESSONS, CONTENT_STRATEGY, MESSAGING_FRAMEWORK, CAMPAIGN_BRIEF
  - **Strategy & Planning**: MARKETING_STRATEGY, CHANNEL_STRATEGY, MEDIA_PLAN, BUDGET_ALLOCATION
  - **Other**: PRODUCT_INFO, CASE_STUDY, OTHER
- Extracts file citations from OpenAI annotations
- Saves Context Pack to database linked to session

### 4. UI Implementation (`src/app/context/page.tsx`)
- Created dedicated `/context` page as **Step 2** in the workflow
- Five expandable panels for different categories:
  1. **Brand & Identity**: Brand voice and visual identity
  2. **Audience & Personas**: Audience summary
  3. **Performance & Analytics**: Key insights
  4. **Creative & Content**: Creative lessons
  5. **Strategy & Planning**: Strategy highlights, budget notes, risks & cautions
- Source files displayed as tags at the bottom
- "Build Context Pack" button triggers the synthesis

### 5. Workflow Reorganization
- **Step 1**: Document Ingestion (`/ingest`)
- **Step 2**: Context Builder (`/context`) ← NEW
- **Step 3**: Brief Parsing (`/brief`)
- **Step 4**: Workflow Orchestration (`/workflow`)
- **Step 5**: Results Dashboard (`/results`)

Updated components:
- `StepIndicator.tsx`: Added `/context` route and updated step names/total
- All page components: Updated step numbers accordingly
- Navigation flow: `/ingest` → `/context` → `/brief` → `/workflow` → `/results`

## Acceptance Criteria ✅
- [x] When user clicks "Build Context Pack," the system retrieves summaries
- [x] File sources are cited for each category
- [x] Five expandable panels display categorized information
- [x] Data is stored in ContextPack table linked to session
- [x] Uses file_search tool with vector store

## Usage
1. Upload documents at `/ingest` (Step 1)
2. Navigate to `/context` (Step 2)
3. Select a brand with uploaded documents
4. Click "Build Context Pack"
5. View synthesized brand intelligence in expandable panels
6. See source file citations at the bottom
7. Continue to `/brief` for brief parsing (Step 3)

## Technical Notes
- Uses OpenAI Assistants API with file_search capability
- Creates a new assistant for each request (can be optimized with caching)
- Robust JSON parsing with multiple extraction strategies
- Stores arrays as JSON strings in SQLite (compatible with the existing schema pattern)
- File citations extracted from OpenAI annotations

## Next Steps
Future milestones will add:
- Trend simulation
- Idea generation
- Scoring
- Panel feedback
