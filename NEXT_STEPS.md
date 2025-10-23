# Next Steps - Deep Research Debugging

## Current Status

✅ Database schema updated (`pnpm db:push` completed)
✅ API endpoints created
✅ UI implementation complete
❌ Research failing immediately after start

## Immediate Action Required

### 1. Test the API (2 minutes)

Open your browser and go to:
```
http://localhost:3000/api/deep-research/test
```

This will tell you exactly what's wrong. You'll see either:

**Success:**
```json
{
  "success": true,
  "message": "Deep research API is working!",
  "response": { "id": "...", "status": "pending", ... }
}
```

**Error (most likely):**
```json
{
  "success": false,
  "error": "The model 'o3-deep-research' does not exist...",
  "suggestion": "Try setting DEEP_RESEARCH_MODEL=o4-mini-deep-research..."
}
```

### 2. Fix Based on Test Result

#### If you see "model does not exist":

Create `.env.local` in project root:
```env
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

Restart server:
```bash
# Press Ctrl+C to stop
pnpm dev
```

#### If you see "Incorrect API key":

Check `.env` or `.env.local`:
```env
OPENAI_API_KEY=sk-proj-...
```

Make sure it's a valid key from https://platform.openai.com/api-keys

#### If you see other errors:

Check the `details` field in the response for more info.

### 3. Test Again

After fixing, try the test endpoint again:
```
http://localhost:3000/api/deep-research/test
```

Once you see `"success": true`, go back to your app and try "Start Deep Research" again.

## Detailed Debugging

### Check Server Logs

In your terminal where `pnpm dev` is running, look for:

```
[Deep Research] Starting with model: o3-deep-research
[Deep Research] Prompt length: 5234
[Deep Research] Tools configured: [...]
[Deep Research] Error starting: { ... }  ← This is the key line
```

The error line will tell you exactly what went wrong.

### Check Database

```bash
pnpm prisma studio
```

1. Open `DeepResearchJob` table
2. Look at the most recent entry
3. Check the `error` field

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors when you click "Start Deep Research"

## Most Likely Issues & Solutions

### Issue 1: Model Not Available (90% chance)

**Symptom**: Error mentions "model does not exist" or "you do not have access"

**Solution**:
```env
# In .env.local
DEEP_RESEARCH_MODEL=o4-mini-deep-research
```

### Issue 2: API Key Invalid (5% chance)

**Symptom**: Error mentions "Incorrect API key" or "authentication"

**Solution**: Get a new API key from https://platform.openai.com/api-keys

### Issue 3: Network/Timeout (3% chance)

**Symptom**: Error mentions "timeout" or "network"

**Solution**: Check your internet connection, try again

### Issue 4: Prompt Too Long (2% chance)

**Symptom**: Error mentions "context length" or "maximum tokens"

**Solution**: The prompt is auto-generated, so this is unlikely. If it happens, we'll need to truncate the prompt.

## Quick Test Commands

### Test 1: Check API Key
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

Should return a list of models.

### Test 2: Check Deep Research Access
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  | grep -i "deep"
```

Should show `o3-deep-research` or `o4-mini-deep-research`.

### Test 3: Test Minimal Request
```bash
curl http://localhost:3000/api/deep-research/test
```

Should return success or detailed error.

## Expected Timeline

Once the API is working:

1. **Immediate** (< 1s): Job created, polling starts
2. **5-30 seconds**: Status changes to "in_progress"
3. **10-30 minutes**: Research completes
4. **Completion**: Results display automatically

## Files Updated

### Modified:
- `src/lib/openai.ts` - Added `getDeepResearchClient()` with 1-hour timeout
- `src/app/api/deep-research/start/route.ts` - Better error logging
- `src/app/api/deep-research/status/route.ts` - Uses deep research client

### Created:
- `src/app/api/deep-research/test/route.ts` - Test endpoint
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `DEBUG_DEEP_RESEARCH.md` - Debug checklist
- `NEXT_STEPS.md` - This file

## What to Do Right Now

1. **Run the test endpoint**: http://localhost:3000/api/deep-research/test
2. **Read the error message**
3. **Apply the suggested fix** (likely: use o4-mini-deep-research)
4. **Restart server**
5. **Try again**

## If Still Stuck

Share these 3 things:

1. **Test endpoint response**: The JSON from http://localhost:3000/api/deep-research/test
2. **Server logs**: The `[Deep Research]` lines from your terminal
3. **Environment**: Which model you're trying to use

## Success Criteria

You'll know it's working when:

✅ Test endpoint returns `"success": true`
✅ "Start Deep Research" button changes to "Research Started"
✅ Status shows "Research Queued" or "Research In Progress"
✅ No "Research Failed" message
✅ Polling continues (see network requests in DevTools)

## Most Important Step

**Go to http://localhost:3000/api/deep-research/test right now.**

This will tell you exactly what's wrong in 2 seconds.
