import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";

const IDEATE_BRIEF_PROMPT = `You are a creative marketing strategist. Generate a realistic, compelling marketing brief for a fictional campaign.

Your brief should:
- Be for a real or plausible brand/product
- Include a clear objective with business impact
- Define a specific target audience with motivations
- Mention timing considerations or launch windows
- List 2-3 measurable KPIs
- Note any constraints (budget, resources, brand guidelines, etc.)
- Be 100-150 words
- Sound professional and strategic

Return ONLY the brief text, no additional formatting or preamble.`;

export async function POST(request: NextRequest) {
  try {
    const client = getOpenAIClient();
    const model = getModel("CREATIVE_MODEL");

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: IDEATE_BRIEF_PROMPT },
        { role: "user", content: "Generate a creative marketing brief for a fictional campaign." }
      ]
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI model" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, brief: content.trim() });
  } catch (error) {
    console.error("Error generating brief:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
