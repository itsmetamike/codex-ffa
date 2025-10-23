# Deep Research Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                     (src/app/results/page.tsx)                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ User clicks "Start Deep Research"
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/deep-research/start                │
│              (src/app/api/deep-research/start/route.ts)         │
│                                                                 │
│  1. Fetch research context from database                        │
│  2. Create OpenAI background job                                │
│  3. Save job to DeepResearchJob table                           │
│  4. Return jobId immediately                                    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Returns jobId
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         UI Polling Loop                         │
│                     (Every 5 seconds)                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ GET /api/deep-research/status?jobId=...
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GET /api/deep-research/status                 │
│             (src/app/api/deep-research/status/route.ts)         │
│                                                                 │
│  1. Fetch job from database                                     │
│  2. Poll OpenAI for status                                      │
│  3. Update database with results                                │
│  4. Return current status                                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Returns status + results
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Updates Display                         │
│                                                                 │
│  • Pending/In Progress: Show spinner + progress bar             │
│  • Completed: Show research report + citations                  │
│  • Failed: Show error message                                   │
└─────────────────────────────────────────────────────────────────┘
```

## OpenAI Background Job Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenAI o3-deep-research                      │
│                      (Background Mode)                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Receives research prompt
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Tool Execution                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Web Search   │  │ Code         │  │ File Search  │         │
│  │              │  │ Interpreter  │  │              │         │
│  │ • Search     │  │              │  │ • Vector     │         │
│  │ • Open pages │  │ • Analyze    │  │   stores     │         │
│  │ • Extract    │  │ • Calculate  │  │ • Documents  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  Typical: 20-50 searches, 10-30 page opens, 5-15 code runs     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ After 10-30 minutes
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Research Complete                          │
│                                                                 │
│  • Full research report (2,000-10,000 words)                    │
│  • Inline citations (10-50 sources)                             │
│  • Structured markdown                                          │
│  • Tool call logs                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                       DeepResearchJob                           │
├─────────────────────────────────────────────────────────────────┤
│ id              String   @id @default(cuid())                   │
│ sessionId       String                                          │
│ responseId      String   @unique  ← OpenAI response ID          │
│ status          String             ← pending/in_progress/...    │
│ prompt          String             ← Full research prompt       │
│ result          String?            ← JSON result                │
│ error           String?            ← Error message              │
│ toolCalls       String?            ← JSON array of tool calls   │
│ startedAt       DateTime @default(now())                        │
│ completedAt     DateTime?                                       │
│ updatedAt       DateTime @updatedAt                             │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine

```
                    ┌──────────┐
                    │  IDLE    │
                    │ (no job) │
                    └──────────┘
                         │
                         │ User clicks button
                         ▼
                    ┌──────────┐
                    │ PENDING  │◄───┐
                    └──────────┘    │
                         │          │
                         │          │ Polling
                         ▼          │
                    ┌──────────┐    │
                    │IN_PROGRESS│───┘
                    └──────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
              ┌──────────┐ ┌──────────┐
              │COMPLETED │ │  FAILED  │
              └──────────┘ └──────────┘
                    │         │
                    └────┬────┘
                         │
                         ▼
                    ┌──────────┐
                    │  FINAL   │
                    │ (display)│
                    └──────────┘
```

## Component Hierarchy

```
ResultsPage
│
├── StepIndicator
│
├── PageHeader
│
├── GenerationBlocksContainer
│   └── Previous generations (context, brief, etc.)
│
├── Research Context Section (if context exists)
│   ├── Prompt preview
│   └── "Start Deep Research" button
│
├── Deep Research Status Section (if job exists)
│   ├── Status header (spinner/checkmark/alert)
│   ├── Progress indicator (if active)
│   ├── Error display (if failed)
│   └── Results display (if completed)
│       ├── Tool call activity log
│       └── Research report (markdown)
│
├── Consultation Chat Section (if no context yet)
│   ├── Chat messages
│   ├── Input field
│   └── "Generate Research Context" button
│
└── Action Buttons
    └── "Start New Session"
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. User Input Phase                          │
│                                                                 │
│  Brief → Context Pack → Exploration → Consultation → Context    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  2. Research Context Assembly                   │
│                                                                 │
│  • Strategy brief JSON                                          │
│  • Context pack JSON                                            │
│  • Exploration categories JSON                                  │
│  • Consultation chat JSON                                       │
│  • Deep research template                                       │
│                                                                 │
│  → Combined into full research prompt                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. Background Processing                      │
│                                                                 │
│  OpenAI o3-deep-research executes:                              │
│  • Web searches                                                 │
│  • Page analysis                                                │
│  • Code execution                                               │
│  • File searches                                                │
│                                                                 │
│  Duration: 10-30 minutes                                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     4. Result Processing                        │
│                                                                 │
│  • Extract output text                                          │
│  • Parse tool calls                                             │
│  • Format citations                                             │
│  • Store in database                                            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      5. Display Results                         │
│                                                                 │
│  • Research report (markdown)                                   │
│  • Inline citations (clickable)                                 │
│  • Tool call activity log                                       │
│  • Completion timestamp                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Polling Mechanism

```
┌─────────────────────────────────────────────────────────────────┐
│                     useEffect Hook                              │
│                                                                 │
│  Triggers when:                                                 │
│  • deepResearchJob.status === 'pending'                         │
│  • deepResearchJob.status === 'in_progress'                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    setInterval(5000)                            │
│                                                                 │
│  Every 5 seconds:                                               │
│  1. Call checkResearchStatus(jobId)                             │
│  2. Fetch from /api/deep-research/status                        │
│  3. Update deepResearchJob state                                │
│  4. If completed/failed: clearInterval()                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cleanup on Unmount                           │
│                                                                 │
│  useEffect cleanup:                                             │
│  • clearInterval(pollingIntervalRef.current)                    │
│  • Prevents memory leaks                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                      Error Sources                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. API Errors                                                  │
│     • OpenAI API down                                           │
│     • Rate limits                                               │
│     • Invalid API key                                           │
│                                                                 │
│  2. Database Errors                                             │
│     • Connection issues                                         │
│     • Schema mismatch                                           │
│                                                                 │
│  3. Research Errors                                             │
│     • Context not found                                         │
│     • Job not found                                             │
│     • Research timeout                                          │
│                                                                 │
│  4. Network Errors                                              │
│     • Fetch failures                                            │
│     • Timeout                                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Error Handling Strategy                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Try/catch blocks in all async functions                      │
│  • Error messages stored in database                            │
│  • UI displays clear error states                               │
│  • Console logging for debugging                                │
│  • Graceful degradation                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                     Optimization Points                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Background Mode                                             │
│     • No client-side timeout                                    │
│     • No connection issues                                      │
│     • Can take 30+ minutes                                      │
│                                                                 │
│  2. Polling Interval                                            │
│     • 5 seconds (configurable)                                  │
│     • Balance: responsiveness vs API calls                      │
│                                                                 │
│  3. Database Caching                                            │
│     • Results stored in DB                                      │
│     • No re-fetch on page refresh                               │
│     • Completed jobs don't poll                                 │
│                                                                 │
│  4. State Management                                            │
│     • Minimal re-renders                                        │
│     • Cleanup on unmount                                        │
│     • Refs for intervals                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Session Isolation                                           │
│     • Jobs tied to sessionId                                    │
│     • No cross-session access                                   │
│                                                                 │
│  2. API Authentication                                          │
│     • OpenAI API key server-side only                           │
│     • No client exposure                                        │
│                                                                 │
│  3. Data Sources                                                │
│     • Web search: public internet only                          │
│     • File search: session's vector store only                  │
│     • No unauthorized data access                               │
│                                                                 │
│  4. Tool Call Transparency                                      │
│     • All tool calls logged                                     │
│     • Visible in UI                                             │
│     • Audit trail in database                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Scalability

```
┌─────────────────────────────────────────────────────────────────┐
│                    Scaling Considerations                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current: Single-server, SQLite                                 │
│  • Good for: Development, small teams                           │
│  • Limit: ~10 concurrent jobs                                   │
│                                                                 │
│  Future: Multi-server, PostgreSQL                               │
│  • Add: Job queue (Redis/Bull)                                  │
│  • Add: Webhook notifications                                   │
│  • Add: Load balancing                                          │
│  • Scale: 100+ concurrent jobs                                  │
└─────────────────────────────────────────────────────────────────┘
```
