import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { z } from "zod";

const AnalysisSchema = z.object({
  missingFields: z.array(z.enum(["objective", "audience", "timing", "kpis", "constraints"])),
  questions: z.array(z.object({
    field: z.string(),
    question: z.string()
  })),
  confidence: z.enum(["high", "medium", "low"])
});

const ANALYSIS_PROMPT = `You are a strategic marketing consultant analyzing a campaign brief. Your role is to help the user think deeper and create a stronger, more comprehensive brief through thoughtful conversation.

Evaluate the brief and identify opportunities to strengthen it:
- objective: Is it specific, measurable, and ambitious? Does it articulate the "why"?
- audience: Is it detailed enough to inform creative decisions? What motivates them?
- timing: Are there strategic considerations around timing and market conditions?
- kpis: Are the success metrics aligned with business goals? Are they ambitious yet achievable?
- constraints: Have all potential limitations been considered? Are there creative opportunities within constraints?

Return ONLY valid JSON matching this schema:
{
  "missingFields": ["array of field names that need work"],
  "questions": [
    {
      "field": "field name",
      "question": "strategic, thought-provoking question"
    }
  ],
  "confidence": "high" | "medium" | "low" (overall confidence in the brief quality)
}

Rules for crafting questions:
- Act as a strategic advisor, not a form-filler
- IMPORTANT: Generate at least one question for EACH of the 5 fields (objective, audience, timing, kpis, constraints)
- Ask questions that help users think deeper about their campaign strategy
- Challenge vague statements and push for specificity
- Help users consider implications and opportunities they might have missed
- For objective: Ask about the deeper business impact, not just what they want to do
- For audience: Ask about motivations, pain points, behaviors - not just demographics
- For timing: Ask about strategic timing, market conditions, competitive landscape, or launch windows
- For kpis: Ask how success connects to broader business goals, what "great" looks like
- For constraints: Ask what creative opportunities exist within limitations, budget considerations
- Questions should feel consultative, not interrogative
- Generate 5 questions total (one per field) unless the brief is exceptionally comprehensive
- Only return empty arrays with "high" confidence if ALL fields are detailed and strategic`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Brief text cannot be empty" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const model = getModel("INTENT_MODEL");

    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: text }
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
    const validated = AnalysisSchema.parse(parsed);
    
    return NextResponse.json({ success: true, data: validated });
  } catch (error) {
    console.error("Error analyzing brief:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
