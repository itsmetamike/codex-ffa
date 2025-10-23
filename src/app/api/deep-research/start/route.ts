import { NextRequest, NextResponse } from "next/server";
import { getDeepResearchClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";
import { 
  DEEP_RESEARCH_STRATEGY_TEMPLATE,
  DEEP_RESEARCH_BIG_IDEA_TEMPLATE 
} from "@/lib/deepResearchNotebookTemplate";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, template = 'strategy' } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Fetch the research context generation
    const contextGen = await (prisma as any).generation.findFirst({
      where: { 
        sessionId,
        type: 'research-context'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!contextGen || !contextGen.content) {
      return NextResponse.json(
        { success: false, error: "Research context not found. Please generate research context first." },
        { status: 400 }
      );
    }

    let researchPackage;
    try {
      researchPackage = typeof contextGen.content === 'string'
        ? JSON.parse(contextGen.content)
        : contextGen.content;
    } catch (parseError: any) {
      console.error("[Deep Research] Error parsing research context:", parseError);
      console.error("[Deep Research] Content type:", typeof contextGen.content);
      console.error("[Deep Research] Content preview:", 
        typeof contextGen.content === 'string' 
          ? contextGen.content.substring(0, 200) + '...'
          : 'Not a string'
      );
      return NextResponse.json(
        { success: false, error: "Failed to parse research context JSON", details: parseError?.message || 'Unknown parse error' },
        { status: 400 }
      );
    }

    if (!researchPackage.deepResearchPrompt) {
      console.error("[Deep Research] Research package structure:", Object.keys(researchPackage));
      return NextResponse.json(
        { success: false, error: "Deep research prompt not found in research context." },
        { status: 400 }
      );
    }

    const client = getDeepResearchClient();
    const model = getModel("DEEP_RESEARCH_MODEL");

    console.log("[Deep Research] Starting with model:", model);
    console.log("[Deep Research] Prompt length:", researchPackage.deepResearchPrompt.length);

    // Get session to check for vector store
    const session = await (prisma as any).session.findUnique({
      where: { id: sessionId }
    });

    // Build tools array - always include web search, code interpreter, and file search if available
    const tools: any[] = [
      { type: "web_search_preview" }, // Always enabled for comprehensive research
      {
        type: "code_interpreter",
        container: { type: "auto" }
      }
    ];

    // Add file search if vector store exists
    if (session?.vectorStoreId) {
      tools.push({
        type: "file_search",
        vector_store_ids: [session.vectorStoreId]
      });
    }

    console.log("[Deep Research] Tools configured:", JSON.stringify(tools, null, 2));

    // Select template based on request
    const selectedTemplate = template === 'big-idea' 
      ? DEEP_RESEARCH_BIG_IDEA_TEMPLATE 
      : DEEP_RESEARCH_STRATEGY_TEMPLATE;
    
    console.log("[Deep Research] Using template:", template);

    // Build Phase 1 prompt (natural research output, no JSON)
    const phase1Prompt = `${selectedTemplate}\n\n---\n\n${researchPackage.deepResearchPrompt}`;

    // Start background deep research (Phase 1: Natural Output)
    const response = await client.responses.create({
      model,
      input: phase1Prompt,
      background: true,
      tools,
      reasoning: {
        summary: "auto"
      }
    });

    console.log("[Deep Research] Response created:", {
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
        prompt: researchPackage.deepResearchPrompt,
        template: template // Store template type for Phase 2
      }
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      responseId: response.id,
      status: response.status
    });
  } catch (error: any) {
    console.error("[Deep Research] Error starting:", {
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
