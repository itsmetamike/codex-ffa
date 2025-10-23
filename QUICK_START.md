# Deep Research - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Update Database
```bash
pnpm db:push
```

### 2. Verify Environment
Ensure `.env` has:
```env
OPENAI_API_KEY=sk-...
```

### 3. Test the Feature
1. Navigate to Results page (Step 5)
2. Complete consultation chat
3. Click "Generate Research Context"
4. Click "Start Deep Research" (purple button)
5. Wait 10-30 minutes for results

## 🎯 What It Does

The purple "Start Deep Research" button triggers:
- **o3-deep-research** model analysis
- **Web search** across hundreds of sources
- **Code interpreter** for data analysis
- **File search** through your documents (if available)

Results in a comprehensive research report with inline citations.

## 📊 Expected Timeline

| Time | Status |
|------|--------|
| 0-5s | Job created, polling starts |
| 5-30s | Status changes to "in_progress" |
| 10-30 min | Research completes |
| Done | Results display automatically |

## 🎨 UI States

### Before Starting
- Shows research prompt preview
- Purple button: "Start Deep Research"

### During Research
- Animated spinner + progress bar
- Message: "Research In Progress"
- Note: "You can leave and return"

### After Completion
- ✅ Green checkmark: "Research Complete"
- Research Activity log (all tool calls)
- Full report with markdown formatting
- Clickable citations

### On Error
- ⚠️ Red alert: "Research Failed"
- Error message displayed

## 🔧 Key Files

| File | Purpose |
|------|---------|
| `src/app/api/deep-research/start/route.ts` | Start research job |
| `src/app/api/deep-research/status/route.ts` | Poll for status |
| `src/app/results/page.tsx` | UI implementation |
| `prisma/schema.prisma` | Database schema |
| `src/config/models.ts` | Model configuration |

## 💡 Tips

### Cost Management
- Deep research can be expensive (many tool calls)
- Monitor usage in OpenAI dashboard
- Consider using `o4-mini-deep-research` for cheaper option

### Debugging
```bash
# Check job status in database
SELECT * FROM DeepResearchJob WHERE sessionId = 'your_session_id';

# Test API directly
curl -X POST http://localhost:3000/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your_session_id"}'
```

### Common Issues

**"Research context not found"**
→ Generate research context first via consultation chat

**Long wait times**
→ Normal! Deep research takes 10-30 minutes

**Polling stops**
→ Check browser console for errors

## 🎯 Success Checklist

- [ ] Database updated (`pnpm db:push`)
- [ ] OpenAI API key configured
- [ ] Can navigate to Results page
- [ ] Can complete consultation chat
- [ ] Can generate research context
- [ ] Can start deep research
- [ ] See progress indicator
- [ ] Results display after completion

## 📚 More Info

- Full setup guide: `DEEP_RESEARCH_SETUP.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Type definitions: `src/types/deepResearch.ts`

## 🎉 That's It!

You're ready to use deep research. The system handles:
- ✅ Background processing (no timeouts)
- ✅ Automatic polling
- ✅ State persistence
- ✅ Error handling
- ✅ Result formatting

Just click the purple button and wait for your comprehensive research report!
