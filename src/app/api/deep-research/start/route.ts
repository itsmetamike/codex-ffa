import { NextRequest, NextResponse } from "next/server";
import { getDeepResearchClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

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

    const researchPackage = typeof contextGen.content === 'string'
      ? JSON.parse(contextGen.content)
      : contextGen.content;

    if (!researchPackage.deepResearchPrompt) {
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

    // Build tools array
    const tools: any[] = [
      { type: "web_search_preview" },
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

    // Start background deep research
    const response = await client.responses.create({
      model,
      input: researchPackage.deepResearchPrompt,
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
        prompt: researchPackage.deepResearchPrompt
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
