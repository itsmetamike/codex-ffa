import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, guardrails } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(guardrails)) {
      return NextResponse.json(
        { error: "Guardrails must be an array" },
        { status: 400 }
      );
    }

    // Delete existing guardrails for this session
    // @ts-expect-error - Prisma types need regeneration
    await (prisma as any).guardrail.deleteMany({
      where: { sessionId }
    });

    // Create new guardrails
    if (guardrails.length > 0) {
      // @ts-expect-error - Prisma types need regeneration
      await (prisma as any).guardrail.createMany({
        data: guardrails.map((item: any) => ({
          sessionId,
          category: item.source,
          summary: item.bullet
        }))
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Guardrails Update API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update guardrails" },
      { status: 500 }
    );
  }
}
