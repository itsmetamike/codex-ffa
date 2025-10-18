import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";

const IDEATE_BRIEF_PROMPT = `You are a creative marketing strategist. Generate a realistic, compelling marketing brief for a campaign.

If Brand Context Pack is provided, you MUST generate a brief that aligns with:
- The brand's voice and tone
- The brand's target audience and their motivations
- The brand's creative lessons and performance insights
- The brand's strategic direction

Your brief should:
- Be for the brand specified in the Context Pack (if provided)
- Include a clear objective with business impact
- Define a specific target audience with motivations (aligned with brand's audience)
- Mention timing considerations or launch windows
- List 2-3 measurable KPIs
- Note any constraints (budget, resources, brand guidelines, etc.)
- Be 100-150 words
- Sound professional and strategic
- Reflect the brand's voice and strategic priorities

Return ONLY the brief text, no additional formatting or preamble.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    const client = getOpenAIClient();
    const model = getModel("CREATIVE_MODEL");

    // Fetch Context Pack if sessionId is provided
    let contextPack = null;
    if (sessionId) {
      try {
        // @ts-expect-error - Prisma types need regeneration
        contextPack = await (prisma as any).contextPack.findFirst({
          where: { sessionId },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err) {
        console.log("[Ideate Brief] No context pack found for session:", sessionId);
      }
    }

    let userMessage = "Generate a creative marketing brief for a campaign.";

    // Add Context Pack if available
    if (contextPack) {
      userMessage = `=== BRAND CONTEXT PACK ===

Brand Voice: ${contextPack.brandVoice}

Visual Identity: ${contextPack.visualIdentity}

Target Audience: ${contextPack.audienceSummary}

Key Performance Insights:
${JSON.parse(contextPack.keyInsights || '[]').map((i: string) => `- ${i}`).join('\n')}

Creative Lessons:
${JSON.parse(contextPack.creativeLessons || '[]').map((l: string) => `- ${l}`).join('\n')}

Strategy Highlights:
${JSON.parse(contextPack.strategyHighlights || '[]').map((s: string) => `- ${s}`).join('\n')}

${contextPack.budgetNotes ? `Budget Notes: ${contextPack.budgetNotes}\n\n` : ''}Risks & Cautions:
${JSON.parse(contextPack.risksOrCautions || '[]').map((r: string) => `- ${r}`).join('\n')}

===

Generate a realistic marketing brief for a campaign that aligns with this brand's voice, audience, and strategic direction.`;
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: IDEATE_BRIEF_PROMPT },
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
