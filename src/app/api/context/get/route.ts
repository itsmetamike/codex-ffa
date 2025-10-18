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

    // Find the most recent context pack for this session
    // @ts-expect-error - Prisma types need regeneration
    const contextPack = await (prisma as any).contextPack.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });

    if (!contextPack) {
      return NextResponse.json({ success: true, contextPack: null });
    }

    return NextResponse.json({ success: true, contextPack });
  } catch (error) {
    console.error("[Context Get API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch context pack" },
      { status: 500 }
    );
  }
}
