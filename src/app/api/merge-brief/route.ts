import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { ParsedBriefSchema } from "@/lib/schemas";
import { getModel } from "@/config/models";
import { z } from "zod";

const MERGE_PROMPT = `You are a strategic marketing consultant helping to refine and enhance a campaign brief based on the user's insights.

You have:
1. An existing parsed brief
2. A user's strategic response to a consultative question
3. The field that the response relates to

Your task: Thoughtfully integrate the user's response to create a stronger, more comprehensive brief.

Return ONLY valid JSON matching this schema:
{
  "objective": "string (required, min 1 char)",
  "audience": "string (required, min 1 char)",
  "timing": "string (optional)",
  "budget": "string (optional)",
  "kpis": ["array of strings"],
  "constraints": ["array of strings"]
}

Rules:
- Synthesize the user's response with existing information to create a richer, more strategic brief
- Don't just append - integrate insights to improve clarity and depth
- For objective: Ensure it captures both the "what" and the "why"
- For audience: Weave in motivations, behaviors, and psychographics beyond demographics
- For timing: Include strategic rationale, not just dates
- For budget: Include dollar amounts and strategic allocation context
- For kpis: Frame metrics in terms of business impact and success criteria
- For constraints: Identify both limitations and creative opportunities
- Maintain professional yet compelling marketing language
- Keep all valuable existing information while enhancing it with new insights
- Return the complete updated brief`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { existingBrief, field, answer } = body;

    if (!existingBrief || !field || !answer) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const model = getModel("INTENT_MODEL");

    const userMessage = `Existing brief:
${JSON.stringify(existingBrief, null, 2)}

Field to update: ${field}
User's answer: ${answer}

Please return the complete updated brief with this new information merged in.`;

    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MERGE_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI model" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    const validated = ParsedBriefSchema.parse(parsed);
    
    return NextResponse.json({ success: true, data: validated });
  } catch (error) {
    console.error("Error merging brief:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
