import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, brand, type, content, step } = body;

    if (!sessionId || !type || !content || !step) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Delete existing generation of this type for this session
    // @ts-expect-error - Prisma types need regeneration
    await prisma.generation.deleteMany({
      where: {
        sessionId,
        type
      }
    });

    // Create new generation
    // @ts-expect-error - Prisma types need regeneration
    const generation = await prisma.generation.create({
      data: {
        sessionId,
        brand: brand || null,
        type,
        content: JSON.stringify(content),
        step
      }
    });

    return NextResponse.json({ success: true, generation });
  } catch (error) {
    console.error("Error saving generation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save generation" },
      { status: 500 }
    );
  }
}
