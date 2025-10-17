import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";

const IDEATE_PROMPT = `You are a strategic marketing consultant helping a marketer answer questions about their campaign brief.

Given:
1. The marketing brief context (objective, audience, timing, KPIs, constraints)
2. A specific question being asked

Your task: Generate a thoughtful, strategic answer that:
- Directly addresses the question
- Is informed by the brief context
- Provides actionable insights
- Uses professional marketing language
- Is concise and focused (maximum 100 words)
- Demonstrates strategic thinking

IMPORTANT: Keep your response under 100 words.

Return ONLY the answer text, no additional formatting or preamble.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { briefContext, question } = body;

    if (!briefContext || !question) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: briefContext and question" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const model = getModel("CREATIVE_MODEL");

    const userMessage = `Marketing Brief Context:
${typeof briefContext === 'string' ? briefContext : JSON.stringify(briefContext, null, 2)}

Question: ${question}

Please provide a strategic answer to this question based on the brief context.`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: IDEATE_PROMPT },
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

    return NextResponse.json({ success: true, answer: content.trim() });
  } catch (error) {
    console.error("Error generating ideate answer:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
