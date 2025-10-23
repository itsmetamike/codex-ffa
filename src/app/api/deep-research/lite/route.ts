import { NextRequest, NextResponse } from "next/server";
import { getDeepResearchClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { LITE_RESEARCH_SYSTEM_PROMPT, buildLiteResearchPrompt } from "@/lib/liteResearchSchema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, useWebSearch = false } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch session and related data
    const session = await (prisma as any).session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Get context pack
    const contextGen = await (prisma as any).generation.findFirst({
      where: { 
        sessionId,
        type: 'context'
      },
      orderBy: { createdAt: 'desc' }
    });

    const contextPack = contextGen?.content 
      ? (typeof contextGen.content === 'string' ? JSON.parse(contextGen.content) : contextGen.content)
      : null;

    // Get exploration categories
    const explorationGen = await (prisma as any).generation.findFirst({
      where: { 
        sessionId,
        type: 'exploration-selection'
      },
      orderBy: { createdAt: 'desc' }
    });

    const explorationData = explorationGen?.content
      ? (typeof explorationGen.content === 'string' ? JSON.parse(explorationGen.content) : explorationGen.content)
      : null;

    // Get consultation summary
    const consultationGen = await (prisma as any).generation.findFirst({
      where: { 
        sessionId,
        type: 'research-context'
      },
      orderBy: { createdAt: 'desc' }
    });

    const consultationData = consultationGen?.content
      ? (typeof consultationGen.content === 'string' ? JSON.parse(consultationGen.content) : consultationGen.content)
      : null;

    // Build lite research prompt
    const prompt = buildLiteResearchPrompt({
      brandVoice: contextPack?.brand_voice,
      visualIdentity: contextPack?.visual_identity,
      audience: contextPack?.audience_summary,
      keyInsights: contextPack?.key_insights,
      objective: session.parsedBrief?.objective,
      budget: session.parsedBrief?.budget,
      kpis: session.parsedBrief?.kpis,
      constraints: contextPack?.guardrails?.map((g: any) => g.bullet),
      explorationCategories: explorationData?.categories,
      consultationSummary: consultationData?.consultationSummary,
      focusAreas: consultationData?.focusAreas
    });

    console.log("[Lite Research] Starting with o4-mini-deep-research");
    console.log("[Lite Research] Web search enabled:", useWebSearch);
    console.log("[Lite Research] Prompt length:", prompt.length);

    const client = getDeepResearchClient();

    // Build tools array - deep research models REQUIRE at least one tool
    const tools: any[] = [];
    if (useWebSearch) {
      tools.push({ type: "web_search_preview" });
    } else {
      // Even without web search, we need to provide a tool for o4-mini-deep-research
      // Use web_search_preview but the model won't use it if not needed
      tools.push({ type: "web_search_preview" });
    }

    console.log("[Lite Research] Tools:", JSON.stringify(tools));
    console.log("[Lite Research] Web search enabled by user:", useWebSearch);

    // Use o4-mini-deep-research with Responses API in background mode
    const response = await client.responses.create({
      model: "o4-mini-deep-research",
      input: prompt,
      instructions: LITE_RESEARCH_SYSTEM_PROMPT,
      background: true, // Run in background for polling
      tools: tools, // Always provide tools array
      reasoning: {
        summary: "auto"
      }
    });

    console.log("[Lite Research] Response created:", {
      id: response.id,
      status: response.status,
      model: response.model
    });

    // Create job record in database
    const job = await (prisma as any).deepResearchJob.create({
      data: {
        sessionId,
        responseId: response.id,
        status: response.status || "pending",
        prompt: prompt.substring(0, 1000) // Store truncated prompt
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      responseId: response.id,
      status: response.status
    });

  } catch (error: any) {
    console.error("[Lite Research] Error:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      response: error?.response?.data
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error?.response?.data || error?.message
      },
      { status: 500 }
    );
  }
}
