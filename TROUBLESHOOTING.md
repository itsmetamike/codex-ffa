# Deep Research Troubleshooting

## "Research Failed" Error

If you see "Research Failed" immediately after clicking "Start Deep Research", follow these steps:

### Step 1: Check Server Logs

Look at your terminal where `pnpm dev` is running. You should see logs like:

```
[Deep Research] Starting with model: o3-deep-research
[Deep Research] Prompt length: 5234
[Deep Research] Tools configured: [...]
```

If you see an error, it will show:
```
[Deep Research] Error starting: { message: '...', ... }
```

### Step 2: Most Common Issue - Model Not Available

**Error**: `The model 'o3-deep-research' does not exist or you do not have access to it.`

**Solution**: Use `o4-mini-deep-research` instead (more widely available):

Create or update `.env.local`:
```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

Then restart your server:
```bash
# Stop the server (Ctrl+C)
pnpm dev
```

### Step 3: Verify API Key

Make sure your `.env` or `.env.local` has a valid OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-...
```

Test it:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

### Step 4: Check Available Models

See which deep research models you have access to:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  | grep -i "deep"
```

You should see either:
- `o3-deep-research` (full version)
- `o4-mini-deep-research` (mini version)

### Step 5: Test with Minimal Example

Temporarily simplify the request to test if the API works at all.

Edit `src/app/api/deep-research/start/route.ts` and replace the `client.responses.create()` call with:

```typescript
// TEMPORARY TEST - Replace this after testing
const response = await client.responses.create({
  model: "o4-mini-deep-research", // Use mini version
  input: "What are the top 3 digital marketing trends for 2025?",
  background: true,
  tools: [
    { type: "web_search_preview" }
  ]
});
```

If this works, the issue is either:
1. Your model access (use o4-mini-deep-research)
2. Your prompt is too long
3. Your tools configuration

### Step 6: Check Database

Query the database to see the actual error:

```bash
# If you have sqlite3 installed
sqlite3 prisma/dev.db "SELECT * FROM DeepResearchJob ORDER BY startedAt DESC LIMIT 1;"
```

Or use Prisma Studio:
```bash
pnpm prisma studio
```

Look at the `DeepResearchJob` table, specifically the `error` field.

## Other Common Issues

### Issue: "Research context not found"

**Cause**: You haven't generated the research context yet.

**Solution**:
1. Complete the consultation chat
2. Click "Generate Research Context" button
3. Wait for context to be generated
4. Then click "Start Deep Research"

### Issue: Timeout errors

**Cause**: Network timeout before background job starts.

**Solution**: This is already handled with the 1-hour timeout in the client. If you still see timeouts, check your network connection.

### Issue: "Job not found" during polling

**Cause**: Database issue or job wasn't created.

**Solution**: Check server logs for database errors. Ensure `pnpm db:push` was run successfully.

### Issue: Polling never completes

**Cause**: Job is actually running but UI isn't updating.

**Solution**:
1. Check browser console for errors
2. Manually check job status:
   ```bash
   curl http://localhost:3000/api/deep-research/status?jobId=YOUR_JOB_ID
   ```
3. Check if polling interval is running (should see network requests every 5 seconds in DevTools Network tab)

## Quick Fixes

### Fix 1: Use Mini Model (Recommended)

In `.env.local`:
```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

### Fix 2: Update OpenAI SDK

```bash
pnpm update openai
```

### Fix 3: Clear and Rebuild

```bash
# Stop server
# Clear Next.js cache
rm -rf .next

# Rebuild
pnpm dev
```

### Fix 4: Check Environment Variables

Make sure `.env` or `.env.local` is in the project root and contains:

```env
OPENAI_API_KEY=sk-proj-...
DATABASE_URL="file:./dev.db"
```

## Still Not Working?

1. **Share server logs**: Copy all `[Deep Research]` log messages
2. **Share database error**: Query the `DeepResearchJob` table and share the `error` field
3. **Share browser console**: Open DevTools (F12) → Console tab, copy any errors
4. **Test API directly**: Use the curl command from Step 3 above

## Expected Behavior

### Successful Flow:
1. Click "Start Deep Research" button
2. Button shows "Starting Research..."
3. Status changes to "Research Queued" or "Research In Progress"
4. Progress bar animates
5. After 10-30 minutes, status changes to "Research Complete"
6. Research report displays with citations

### Your Flow (if failing):
1. Click button ✅
2. Button shows "Starting Research..." ✅
3. Status immediately shows "Research Failed" ❌

This means the OpenAI API call failed. Check server logs for the exact error message.

## Model Availability

As of now, deep research models may have limited availability:

- **o3-deep-research**: Full version, may require waitlist access
- **o4-mini-deep-research**: Mini version, more widely available

If you don't have access to either, you'll need to:
1. Check your OpenAI account tier
2. Request access through OpenAI
3. Wait for model rollout to your account

## Contact

If you've tried all the above and it's still not working, the issue is likely:
1. Model access (most common)
2. API key permissions
3. Account tier limitations

Check your OpenAI dashboard for model access and API limits.
