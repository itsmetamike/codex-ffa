import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Delete all generation records for this session
    // @ts-expect-error - Prisma types need regeneration
    const result = await prisma.generation.deleteMany({
      where: {
        sessionId
      }
    });

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `Deleted ${result.count} generation records`
    });
  } catch (error) {
    console.error("Error clearing generations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear generations" },
      { status: 500 }
    );
  }
}
