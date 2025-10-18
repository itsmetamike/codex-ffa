import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ContextPackSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, contextPack } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!contextPack) {
      return NextResponse.json(
        { error: "Context pack data is required" },
        { status: 400 }
      );
    }

    // Validate the context pack data
    const validated = ContextPackSchema.parse(contextPack);

    // Find existing context pack for this session
    // @ts-expect-error - Prisma types need regeneration
    const existing = await (prisma as any).contextPack.findFirst({
      where: { sessionId }
    });

    if (existing) {
      // Update existing context pack
      // @ts-expect-error - Prisma types need regeneration
      await (prisma as any).contextPack.update({
        where: { id: existing.id },
        data: {
          brandVoice: validated.brand_voice,
          visualIdentity: validated.visual_identity,
          audienceSummary: validated.audience_summary,
          keyInsights: JSON.stringify(validated.key_insights),
          creativeLessons: JSON.stringify(validated.creative_lessons),
          strategyHighlights: JSON.stringify(validated.strategy_highlights),
          budgetNotes: validated.budget_notes || null,
          risksOrCautions: JSON.stringify(validated.risks_or_cautions)
        }
      });
    } else {
      // Create new context pack if none exists
      // @ts-expect-error - Prisma types need regeneration
      await (prisma as any).contextPack.create({
        data: {
          sessionId,
          brandVoice: validated.brand_voice,
          visualIdentity: validated.visual_identity,
          audienceSummary: validated.audience_summary,
          keyInsights: JSON.stringify(validated.key_insights),
          creativeLessons: JSON.stringify(validated.creative_lessons),
          strategyHighlights: JSON.stringify(validated.strategy_highlights),
          budgetNotes: validated.budget_notes || null,
          risksOrCautions: JSON.stringify(validated.risks_or_cautions),
          sources: JSON.stringify([]) // Empty sources for manual updates
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Context Update API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update context pack" },
      { status: 500 }
    );
  }
}
