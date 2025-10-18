import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find all guardrails for this session
    // @ts-expect-error - Prisma types need regeneration
    const guardrails = await (prisma as any).guardrail.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match GuardrailItem schema
    const transformed = guardrails.map((g: any) => ({
      bullet: g.summary,
      source: g.category
    }));

    return NextResponse.json({ success: true, guardrails: transformed });
  } catch (error) {
    console.error("[Guardrails Get API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch guardrails" },
      { status: 500 }
    );
  }
}
