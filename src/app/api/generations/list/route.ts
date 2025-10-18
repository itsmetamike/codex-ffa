import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // @ts-expect-error - Prisma types need regeneration
    const generations = await prisma.generation.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ success: true, generations });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}
