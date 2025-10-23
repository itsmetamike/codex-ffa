# Deep Research Debugging Guide

## Issue: "Research Failed" after starting

Based on your screenshot showing "Research Failed" but POST returning 200, here are the debugging steps:

### 1. Check Server Console Logs

Look for these log messages in your terminal where `pnpm dev` is running:

```
[Deep Research] Starting with model: o3-deep-research
[Deep Research] Prompt length: XXXX
[Deep Research] Tools configured: [...]
[Deep Research] Response created: { id: '...', status: '...', model: '...' }
```

Or error messages:
```
[Deep Research] Error starting: { ... }
```

### 2. Common Issues & Fixes

#### Issue: Model not available
**Error**: `model 'o3-deep-research' does not exist`

**Fix**: The model might not be available in your OpenAI account yet. Try using `o4-mini-deep-research` instead:

In `.env`:
```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

#### Issue: Missing tools
**Error**: `At least one data source required`

**Fix**: Ensure at least one tool is configured. The code already includes `web_search_preview` and `code_interpreter`, so this shouldn't be the issue.

#### Issue: Invalid API key
**Error**: `Incorrect API key provided`

**Fix**: Check your `.env` file:
```env
OPENAI_API_KEY=sk-proj-...
```

#### Issue: Prompt too long
**Error**: `maximum context length exceeded`

**Fix**: The research prompt might be too long. Check the console log for prompt length.

### 3. Test API Directly

Test the OpenAI API directly to isolate the issue:

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "o3-deep-research",
    "input": "Test research query: What are the latest trends in AI?",
    "background": true,
    "tools": [
      { "type": "web_search_preview" },
      { "type": "code_interpreter", "container": { "type": "auto" } }
    ]
  }'
```

Expected response:
```json
{
  "id": "resp_...",
  "status": "pending",
  "model": "o3-deep-research",
  ...
}
```

### 4. Check Database

Query the database to see what was saved:

```sql
SELECT * FROM DeepResearchJob ORDER BY startedAt DESC LIMIT 1;
```

Look for:
- `status`: Should be "pending" initially
- `error`: Should be NULL if no error
- `responseId`: Should have an OpenAI response ID

### 5. Check Browser Console

Open browser DevTools (F12) and look for:

```javascript
// In Console tab
Failed to start research: [error message]
```

### 6. Enable Verbose Logging

Add more logging to see the full request/response:

In `src/app/api/deep-research/start/route.ts`, before the `client.responses.create()` call:

```typescript
console.log("[Deep Research] Full request:", {
  model,
  inputLength: researchPackage.deepResearchPrompt.length,
  background: true,
  tools,
  reasoning: { summary: "auto" }
});
```

### 7. Common Solutions

#### Solution 1: Update OpenAI SDK
```bash
pnpm update openai
```

#### Solution 2: Use o4-mini-deep-research
The mini model is more widely available:

```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

#### Solution 3: Simplify the prompt
If the prompt is too long, try a shorter test:

Temporarily modify the prompt in the API:
```typescript
input: "Research the top 3 digital marketing trends for 2025. Include specific examples and data.",
```

#### Solution 4: Check model availability
Run this to check which models you have access to:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | grep -i "deep-research"
```

### 8. Expected Flow

**Successful flow:**
1. User clicks "Start Deep Research"
2. POST /api/deep-research/start returns 200 with jobId
3. UI shows "Research Queued" or "Research In Progress"
4. Polling starts every 5 seconds
5. After 10-30 minutes, status changes to "completed"
6. Results display in UI

**Your current flow:**
1. User clicks "Start Deep Research"
2. POST returns 200 ✅
3. UI shows "Research Failed" ❌

This suggests the job was created but immediately failed. Check:
- Server console for error logs
- Database `DeepResearchJob` table for error field
- Browser console for error messages

### 9. Quick Test

Try this minimal test to verify the API works:

1. Comment out the full prompt and use a simple test:

```typescript
// In src/app/api/deep-research/start/route.ts
const response = await client.responses.create({
  model: "o4-mini-deep-research", // Use mini version
  input: "What are the top 3 AI trends in 2025?",
  background: true,
  tools: [
    { type: "web_search_preview" }
  ]
});
```

2. Restart server: `pnpm dev`
3. Try again

If this works, the issue is with your prompt or model access.

### 10. Get Help

If still failing, share these details:
- Server console logs (all [Deep Research] messages)
- Database query result from DeepResearchJob
- Browser console errors
- Output of: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | grep deep`

## Next Steps

1. **Check server console** - This is the most important step
2. **Try o4-mini-deep-research** - More widely available
3. **Test with simple prompt** - Verify API access
4. **Check database** - See what error was saved

The fact that POST returned 200 means the endpoint is working, but something failed during the OpenAI API call. The server console logs will tell you exactly what went wrong.
