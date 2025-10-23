import { NextRequest, NextResponse } from "next/server";
import { getDeepResearchClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Fetch job from database
    const job = await (prisma as any).deepResearchJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // If job is already completed or failed, return cached result
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        success: true,
        status: job.status,
        result: job.result ? JSON.parse(job.result) : null,
        error: job.error,
        toolCalls: job.toolCalls ? JSON.parse(job.toolCalls) : null,
        completedAt: job.completedAt
      });
    }

    // Poll OpenAI for status
    const client = getDeepResearchClient();
    
    try {
      const response = await client.responses.retrieve(job.responseId);

      // Update job status
      const updateData: any = {
        status: response.status,
        updatedAt: new Date()
      };

      // If completed, extract result
      if (response.status === "completed") {
        updateData.completedAt = new Date();
        
        // Extract output text and tool calls
        const result = {
          outputText: response.output_text || "",
          output: response.output || []
        };
        
        updateData.result = JSON.stringify(result);

        // Extract tool calls for display
        const toolCalls = response.output?.filter((item: any) => 
          item.type === "web_search_call" || 
          item.type === "code_interpreter_call" || 
          item.type === "mcp_tool_call" ||
          item.type === "file_search_call"
        ) || [];
        
        updateData.toolCalls = JSON.stringify(toolCalls);
      } else if (response.status === "failed") {
        updateData.completedAt = new Date();
        updateData.error = response.error?.message || "Research failed";
      }

      // Update database
      await (prisma as any).deepResearchJob.update({
        where: { id: jobId },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        status: response.status,
        result: updateData.result ? JSON.parse(updateData.result) : null,
        error: updateData.error,
        toolCalls: updateData.toolCalls ? JSON.parse(updateData.toolCalls) : null,
        completedAt: updateData.completedAt
      });
    } catch (apiError: any) {
      // If API call fails, check if it's a not found error
      if (apiError.status === 404) {
        await (prisma as any).deepResearchJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: "Response not found in OpenAI",
            completedAt: new Date()
          }
        });

        return NextResponse.json({
          success: true,
          status: "failed",
          error: "Response not found in OpenAI"
        });
      }

      throw apiError;
    }
  } catch (error) {
    console.error("Error checking deep research status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
