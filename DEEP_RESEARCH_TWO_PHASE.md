# Two-Phase Deep Research Implementation

## Overview
Implemented a two-phase deep research system that preserves comprehensive research context while still providing structured JSON output. This consolidates the previous "lite" and "full" research modes into a single, unified deep research flow.

## Architecture

### Phase 1: Deep Research (Natural Output)
- **Model**: `o4-mini-deep-research-2025-06-26` (via `DEEP_RESEARCH_MODEL` config)
- **Output**: Natural research output (typically markdown/text with full findings)
- **Template**: `DEEP_RESEARCH_PHASE1_TEMPLATE` in `deepResearchNotebookTemplate.ts`
- **API**: `/api/deep-research/start` (POST)
- **Purpose**: Conduct extensive research without format constraints, preserving all context and detail
- **Tools**: Web search (always enabled), code interpreter, file search (if available)

### Phase 2: Structuring (JSON Extraction)
- **Model**: `gpt-4o` (hardcoded for fast, reliable extraction)
- **Input**: Research output from Phase 1
- **Output**: Structured JSON matching `DELIVERABLE_SCHEMA`
- **Template**: `DEEP_RESEARCH_PHASE2_TEMPLATE` in `deepResearchStructuringTemplate.ts`
- **API**: `/api/deep-research/structure` (POST)
- **Purpose**: Extract key insights from research and structure into JSON for UI rendering
- **Note**: Uses GPT-4o for cost-effective, high-quality structured output

## User Flow

1. **Start Deep Research** → Phase 1 begins
   - User clicks "Start Deep Research"
   - System generates comprehensive markdown research
   - All web searches, tool calls, and analysis preserved

2. **View Research Notebook** → Raw markdown display
   - User sees full research output in markdown format
   - All context, sources, and detailed analysis visible
   - Toggle to "Research Notebook" view

3. **Generate Structured Output** → Phase 2 begins
   - User clicks "Generate Structured Output" button
   - System extracts and structures key insights into JSON
   - Cheaper model processes the markdown

4. **View Structured Output** → JSON display
   - User toggles to "Structured Output" view
   - Sees formatted strategy cards with key fields
   - Same UI as before, but now backed by full research

## Benefits

### ✅ No Information Loss
- Full research preserved in markdown format
- All sources, data points, and analysis accessible
- Can reference detailed research when needed

### ✅ Quality Optimization
- Same powerful model used for both phases ensures quality
- Phase 1: Unconstrained research without JSON limitations
- Phase 2: Sophisticated structured output from rich context
- No need to re-run expensive research if structuring fails

### ✅ Flexible Display
- Toggle between full research and structured summary
- Users can dive deep or stay high-level
- Best of both worlds

### ✅ Simplified UX
- Single "Deep Research" option (no more lite vs full confusion)
- Web search always enabled
- Clear two-phase workflow

## Files Modified

### Types
- `src/types/deepResearch.ts` - Added `researchNotebook`, `structuredData`, `phase` fields

### Templates
- `src/lib/deepResearchNotebookTemplate.ts` - Phase 1 template (markdown research)
- `src/lib/deepResearchStructuringTemplate.ts` - Phase 2 template (JSON extraction)

### API Routes
- `src/app/api/deep-research/start/route.ts` - Updated to use Phase 1 template
- `src/app/api/deep-research/status/route.ts` - Tracks phase and stores markdown
- `src/app/api/deep-research/structure/route.ts` - NEW: Phase 2 structuring endpoint

### UI
- `src/app/deep-research/page.tsx` - Added view toggle, structure button, markdown display

## Data Structure

```typescript
interface DeepResearchResult {
  outputText: string;           // Original output
  output: OutputItem[];         // Tool calls
  researchNotebook?: string;    // Phase 1: Full markdown research
  structuredData?: any;         // Phase 2: Extracted JSON
  phase?: 'research' | 'structuring' | 'completed';
}
```

## Usage Example

```typescript
// Phase 1: Start research
const response1 = await fetch('/api/deep-research/start', {
  method: 'POST',
  body: JSON.stringify({ sessionId })
});
// → Generates markdown research notebook

// Phase 2: Structure the research
const response2 = await fetch('/api/deep-research/structure', {
  method: 'POST',
  body: JSON.stringify({ jobId })
});
// → Extracts JSON from markdown

// UI: Toggle between views
<button onClick={() => setViewMode('markdown')}>Research Notebook</button>
<button onClick={() => setViewMode('structured')}>Structured Output</button>
```

## Future Enhancements

### Potential Improvements
1. **Search within research** - Add search/filter for markdown content
2. **Export options** - PDF export of full research notebook
3. **Incremental structuring** - Structure individual sections on demand
4. **Research versioning** - Track changes between research runs
5. **Citation linking** - Link structured claims back to markdown sources
6. **Confidence scoring** - Indicate strength of evidence for each claim

### Advanced Features
- **Multi-strategy structuring** - Extract all 3 strategies from single research
- **Custom extraction** - User-defined fields to extract from research
- **Research comparison** - Compare multiple research runs side-by-side
- **Collaborative annotations** - Team members can highlight/comment on research

## Testing Checklist

- [ ] Phase 1 generates comprehensive markdown
- [ ] Markdown displays correctly in UI
- [ ] Phase 2 button appears after Phase 1 completes
- [ ] Phase 2 extracts valid JSON from markdown
- [ ] Structured view displays correctly
- [ ] Toggle between views works smoothly
- [ ] Tool calls are tracked and displayed
- [ ] Error handling for failed structuring
- [ ] Backward compatibility with lite research
