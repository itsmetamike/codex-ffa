import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AnalysisSchema = z.object({
  missingFields: z.array(z.enum(["objective", "audience", "timing", "budget", "kpis", "constraints"])),
  questions: z.array(z.object({
    field: z.string(),
    question: z.string()
  })),
  confidence: z.enum(["high", "medium", "low"])
});

const ANALYSIS_PROMPT = `You are a strategic marketing consultant analyzing a campaign brief. Your role is to help the user think deeper and create a stronger, more comprehensive brief through thoughtful conversation.

You will receive:
1. The original brief text
2. The parsed brief structure (objective, audience, timing, kpis, constraints)
3. Any previous Q&A conversation history (if available)
4. Brand Context Pack (if available) - historical brand intelligence including voice, identity, audience insights, performance data, creative lessons, and strategy

Use the Brand Context Pack to inform your questions and ensure they align with the brand's established voice, audience, and strategic direction.

Evaluate the brief and identify opportunities to strengthen it:
- objective: Is it specific, measurable, and ambitious? Does it articulate the "why"?
- audience: Is it detailed enough to inform creative decisions? What motivates them?
- timing: Are there strategic considerations around timing and market conditions?
- budget: Is the budget clearly defined? Are there allocation priorities or efficiency opportunities?
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
- CRITICAL: Review the parsed brief AND conversation history to avoid asking about information that has already been provided
- DO NOT ask questions about fields that have already been thoroughly answered in the conversation
- IMPORTANT: Generate at least one question for EACH of the 6 fields (objective, audience, timing, budget, kpis, constraints) UNLESS that field has been comprehensively addressed
- Ask questions that help users think deeper about their campaign strategy
- Challenge vague statements and push for specificity
- Help users consider implications and opportunities they might have missed
- For objective: Ask about the deeper business impact, not just what they want to do
- For audience: Ask about motivations, pain points, behaviors - not just demographics
- For timing: Ask about strategic timing, market conditions, competitive landscape, or launch windows
- For budget: Ask about allocation priorities, efficiency opportunities, or investment rationale
- For kpis: Ask how success connects to broader business goals, what "great" looks like
- For constraints: Ask what creative opportunities exist within limitations
- Questions should feel consultative, not interrogative
- Generate 6 questions total (one per field) unless the brief is exceptionally comprehensive OR fields have been answered
- Only return empty arrays with "high" confidence if ALL fields are detailed and strategic`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, parsedBrief, conversationHistory, sessionId } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Brief text cannot be empty" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const model = getModel("INTENT_MODEL");

    // Fetch Context Pack if sessionId is provided
    let contextPack = null;
    if (sessionId) {
      try {
        contextPack = await prisma.contextPack.findFirst({
          where: { sessionId },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err) {
        console.log("[Analyze Brief] No context pack found for session:", sessionId);
      }
    }

    // Build context message
    let contextMessage = `Original Brief:\n${text}`;
    
    if (parsedBrief) {
      contextMessage += `\n\nParsed Brief Structure:\n${JSON.stringify(parsedBrief, null, 2)}`;
    }
    
    // Add Context Pack if available
    if (contextPack) {
      contextMessage += `\n\n=== BRAND CONTEXT PACK ===`;
      contextMessage += `\n\nBrand Voice:\n${contextPack.brandVoice}`;
      contextMessage += `\n\nVisual Identity:\n${contextPack.visualIdentity}`;
      contextMessage += `\n\nAudience Summary:\n${contextPack.audienceSummary}`;
      
      const keyInsights = JSON.parse(contextPack.keyInsights || '[]');
      if (keyInsights.length > 0) {
        contextMessage += `\n\nKey Performance Insights:\n${keyInsights.map((i: string) => `- ${i}`).join('\n')}`;
      }
      
      const creativeLessons = JSON.parse(contextPack.creativeLessons || '[]');
      if (creativeLessons.length > 0) {
        contextMessage += `\n\nCreative Lessons:\n${creativeLessons.map((l: string) => `- ${l}`).join('\n')}`;
      }
      
      const strategyHighlights = JSON.parse(contextPack.strategyHighlights || '[]');
      if (strategyHighlights.length > 0) {
        contextMessage += `\n\nStrategy Highlights:\n${strategyHighlights.map((s: string) => `- ${s}`).join('\n')}`;
      }
      
      if (contextPack.budgetNotes) {
        contextMessage += `\n\nBudget Notes:\n${contextPack.budgetNotes}`;
      }
      
      const risks = JSON.parse(contextPack.risksOrCautions || '[]');
      if (risks.length > 0) {
        contextMessage += `\n\nRisks & Cautions:\n${risks.map((r: string) => `- ${r}`).join('\n')}`;
      }
    }
    
    if (conversationHistory && conversationHistory.length > 0) {
      contextMessage += `\n\nConversation History:`;
      conversationHistory.forEach((step: any, index: number) => {
        if (step.type === "question") {
          contextMessage += `\n\nQ${Math.floor(index / 2) + 1}: ${step.content}`;
        } else if (step.type === "answer") {
          contextMessage += `\nA: ${step.content}`;
        }
      });
    }

    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: contextMessage }
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
