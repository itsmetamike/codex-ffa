import { NextRequest, NextResponse } from "next/server";
import { getDeepResearchClient } from "@/lib/openai";
import { getModel } from "@/config/models";

/**
 * Test endpoint to verify deep research API access
 * GET /api/deep-research/test
 */
export async function GET(request: NextRequest) {
  try {
    const client = getDeepResearchClient();
    const model = getModel("DEEP_RESEARCH_MODEL");

    console.log("[Deep Research Test] Testing with model:", model);

    // Try a minimal deep research request
    const response = await client.responses.create({
      model,
      input: "What are the top 3 AI trends in 2025? Be brief.",
      background: true,
      tools: [
        { type: "web_search_preview" }
      ]
    });

    console.log("[Deep Research Test] Success! Response:", {
      id: response.id,
      status: response.status,
      model: response.model
    });

    return NextResponse.json({
      success: true,
      message: "Deep research API is working!",
      response: {
        id: response.id,
        status: response.status,
        model: response.model
      }
    });
  } catch (error: any) {
    console.error("[Deep Research Test] Error:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      response: error?.response?.data
    });

    // Return detailed error information
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
        details: {
          status: error?.status,
          code: error?.code,
          type: error?.type,
          response: error?.response?.data,
          message: error?.message
        },
        suggestion: error?.message?.includes("does not exist") 
          ? "Try setting DEEP_RESEARCH_MODEL=o4-mini-deep-research in your .env file"
          : "Check your OpenAI API key and account access"
      },
      { status: 500 }
    );
  }
}
