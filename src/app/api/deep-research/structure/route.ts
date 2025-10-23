import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";
import { DEEP_RESEARCH_PHASE2_TEMPLATE } from "@/lib/deepResearchStructuringTemplate";
import { BIG_IDEA_SCHEMA } from "@/lib/bigIdeaSchema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Fetch the completed deep research job
    const job = await (prisma as any).deepResearchJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Job must be completed before structuring" },
        { status: 400 }
      );
    }

    if (!job.result) {
      return NextResponse.json(
        { success: false, error: "No research output found" },
        { status: 400 }
      );
    }

    const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
    const markdownResearch = result.outputText;

    if (!markdownResearch) {
      return NextResponse.json(
        { success: false, error: "No markdown research found" },
        { status: 400 }
      );
    }

    console.log("[Deep Research Phase 2] Starting structuring...");
    console.log("[Deep Research Phase 2] Markdown length:", markdownResearch.length);
    console.log("[Deep Research Phase 2] Template type:", job.template);

    // Use GPT-4o for structured output extraction
    const client = getOpenAIClient();
    const model = "gpt-4o"; // Fast and capable for extraction tasks

    // Select schema based on template type
    const schemaTemplate = job.template === 'big-idea' 
      ? BIG_IDEA_SCHEMA 
      : DEEP_RESEARCH_PHASE2_TEMPLATE;
    
    console.log("[Deep Research Phase 2] Using schema for:", job.template);

    // Build Phase 2 prompt
    const phase2Prompt = `${schemaTemplate}\n\n---\n\n# Research to Structure:\n\n${markdownResearch}`;

    // Call OpenAI to structure the markdown into JSON
    // Use JSON mode to ensure valid JSON output
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a strategic research analyst. Extract and structure research insights into valid JSON format according to the provided schema. Return ONLY valid JSON, no additional text. Be comprehensive - include ALL details from the research."
        },
        {
          role: "user",
          content: phase2Prompt
        }
      ],
      response_format: { type: "json_object" }, // Force JSON output
      temperature: 0.3, // Lower temperature for more consistent structuring
      max_tokens: 16000, // Allow long structured outputs
    });

    const structuredOutput = completion.choices[0]?.message?.content;

    if (!structuredOutput) {
      return NextResponse.json(
        { success: false, error: "Failed to generate structured output" },
        { status: 500 }
      );
    }

    console.log("[Deep Research Phase 2] Structured output length:", structuredOutput.length);
    console.log("[Deep Research Phase 2] First 500 chars:", structuredOutput.substring(0, 500));
    console.log("[Deep Research Phase 2] Finish reason:", completion.choices[0]?.finish_reason);
    console.log("[Deep Research Phase 2] Usage:", completion.usage);

    // Parse and validate JSON
    let structuredData;
    try {
      // Remove markdown code blocks if present
      let cleanedOutput = structuredOutput.trim();
      cleanedOutput = cleanedOutput.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
      structuredData = JSON.parse(cleanedOutput);
    } catch (parseError) {
      console.error("[Deep Research Phase 2] JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Failed to parse structured JSON", details: structuredOutput.substring(0, 500) },
        { status: 500 }
      );
    }

    // Update job with structured data
    const updatedResult = {
      ...result,
      researchNotebook: markdownResearch,
      structuredData: structuredData,
      phase: 'completed'
    };

    await (prisma as any).deepResearchJob.update({
      where: { id: jobId },
      data: {
        result: JSON.stringify(updatedResult),
        updatedAt: new Date()
      }
    });

    console.log("[Deep Research Phase 2] Structuring completed successfully");

    return NextResponse.json({
      success: true,
      structuredData: structuredData,
      markdownLength: markdownResearch.length
    });
  } catch (error: any) {
    console.error("[Deep Research Phase 2] Error:", {
      message: error?.message,
      status: error?.status,
      code: error?.code
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
