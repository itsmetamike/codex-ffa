# Deep Research Implementation Guide

## Overview
This implementation adds o3-deep-research capabilities to the application, allowing comprehensive multi-step research with web search, file search, and code interpreter tools.

## Setup Instructions

### 1. Update Database Schema
Run the following command to update your database with the new DeepResearchJob model:

```bash
pnpm db:push
```

This will add the `DeepResearchJob` table to track background research tasks.

### 2. Environment Variables
Ensure your `.env` file has the OpenAI API key configured:

```env
OPENAI_API_KEY=your_api_key_here
```

Optionally, you can override the deep research model:

```env
DEEP_RESEARCH_MODEL=o3-deep-research
# or use the mini version:
# DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

### 3. How It Works

#### Architecture
1. **Background Processing**: Research tasks run in background mode via OpenAI's Responses API
2. **Polling Mechanism**: UI polls every 5 seconds to check job status
3. **State Management**: Job state persisted in database for reliability
4. **Tool Integration**: Automatically includes web search, code interpreter, and file search (if vector store exists)

#### User Flow
1. User completes consultation chat and generates research context
2. User clicks "Start Deep Research" button (purple)
3. API creates background job and returns immediately
4. UI shows progress indicator and polls for status
5. When complete, displays comprehensive research report with:
   - Tool call activity log (searches, page opens, code execution)
   - Full research output with inline citations
   - Clickable external links

#### API Endpoints

**POST `/api/deep-research/start`**
- Starts a new deep research job
- Returns: `{ success, jobId, responseId, status }`

**GET `/api/deep-research/status?jobId={id}`**
- Polls for job status
- Returns: `{ success, status, result, error, toolCalls, completedAt }`

#### Database Schema

```prisma
model DeepResearchJob {
  id              String   @id @default(cuid())
  sessionId       String
  responseId      String   @unique // OpenAI response ID
  status          String   // "pending", "in_progress", "completed", "failed"
  prompt          String   // Research prompt
  result          String?  // JSON result
  error           String?  // Error message
  toolCalls       String?  // JSON array of tool calls
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  updatedAt       DateTime @updatedAt
}
```

### 4. UI States

#### Before Research Starts
- Shows research context with prompt preview
- Purple "Start Deep Research" button enabled

#### During Research (pending/in_progress)
- Animated spinner and progress bar
- Status message: "Research Queued" or "Research In Progress"
- Estimated time: 10-30 minutes
- Note that user can leave and return

#### After Completion
- Green checkmark with "Research Complete"
- Research Activity log showing all tool calls
- Full research report with markdown formatting
- Clickable citations with external link icons
- Completion timestamp

#### On Failure
- Red alert icon with "Research Failed"
- Error message displayed

### 5. Best Practices

#### Cost Management
- Deep research can be expensive due to multiple tool calls
- Monitor usage in OpenAI dashboard
- Consider using `max_tool_calls` parameter to limit cost (not currently implemented)

#### Timeout Handling
- Background mode handles long-running tasks (10-30+ minutes)
- No client-side timeout issues
- Polling continues until completion or failure

#### Error Recovery
- Jobs persist in database
- Can resume polling if page is refreshed
- Failed jobs show clear error messages

#### Security Considerations
- Only trusted vector stores should be connected
- Web search results are from public internet
- Review tool call logs for unexpected behavior
- Consider implementing approval flows for sensitive data

### 6. Customization Options

#### Adjust Polling Interval
In `src/app/results/page.tsx`, line ~170:
```typescript
}, 5000); // Poll every 5 seconds - adjust as needed
```

#### Change Model
In `.env`:
```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research  # Faster, cheaper option
```

#### Add Max Tool Calls Limit
In `src/app/api/deep-research/start/route.ts`, add to response.create():
```typescript
max_tool_calls: 50  // Limit total tool calls
```

### 7. Monitoring & Debugging

#### Check Job Status
Query the database:
```sql
SELECT * FROM DeepResearchJob WHERE sessionId = 'your_session_id';
```

#### View Tool Calls
Tool calls are stored as JSON in the `toolCalls` field:
- `web_search_call`: Web searches and page opens
- `code_interpreter_call`: Code execution
- `file_search_call`: Vector store searches
- `mcp_tool_call`: MCP server calls (if configured)

#### Common Issues

**"Research context not found"**
- User must generate research context first via consultation chat
- Click "Generate Research Context" button before starting deep research

**Polling stops unexpectedly**
- Check browser console for errors
- Verify API endpoints are accessible
- Check OpenAI API status

**Long wait times**
- Deep research typically takes 10-30 minutes
- Complex queries may take longer
- Check OpenAI dashboard for job status

### 8. Future Enhancements

Potential improvements:
- [ ] Add webhook support for completion notifications
- [ ] Implement max_tool_calls configuration
- [ ] Add ability to cancel running jobs
- [ ] Save research results to Generation table for history
- [ ] Add export functionality (PDF, DOCX)
- [ ] Implement streaming updates during research
- [ ] Add cost estimation before starting
- [ ] Support multiple concurrent research jobs

## Testing

### Manual Testing Steps
1. Complete brief and context pack (Steps 1-3)
2. Select exploration categories (Step 4)
3. Navigate to Results page (Step 5)
4. Chat with consultant about research needs
5. Click "Generate Research Context"
6. Verify research prompt appears
7. Click "Start Deep Research"
8. Verify progress indicator appears
9. Wait for completion (or check back later)
10. Verify research report displays with citations

### API Testing
```bash
# Start research
curl -X POST http://localhost:3000/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your_session_id"}'

# Check status
curl http://localhost:3000/api/deep-research/status?jobId=your_job_id
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review OpenAI API logs
3. Verify database schema is up to date
4. Check that all environment variables are set
