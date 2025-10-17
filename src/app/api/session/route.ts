import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Load a session
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

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    // Parse the stored JSON string back to object
    const parsedBrief = session.parsedBrief 
      ? JSON.parse(session.parsedBrief) 
      : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        brief: session.brief,
        parsedBrief,
        vectorStoreId: session.vectorStoreId,
        currentStep: 1, // Default to step 1, can be enhanced later
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error loading session:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to load session" 
      },
      { status: 500 }
    );
  }
}

// POST - Create a new session
export async function POST() {
  try {
    const session = await prisma.session.create({
      data: {},
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        brief: session.brief,
        parsedBrief: null,
        vectorStoreId: session.vectorStoreId,
        currentStep: 1,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create session" 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, brief, parsedBrief, vectorStoreId, currentStep } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Build update data object
    const updateData: any = {};
    
    if (brief !== undefined) updateData.brief = brief;
    if (vectorStoreId !== undefined) updateData.vectorStoreId = vectorStoreId;
    if (parsedBrief !== undefined) {
      updateData.parsedBrief = JSON.stringify(parsedBrief);
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Parse the stored JSON string back to object
    const parsedBriefObj = session.parsedBrief 
      ? JSON.parse(session.parsedBrief) 
      : null;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        brief: session.brief,
        parsedBrief: parsedBriefObj,
        vectorStoreId: session.vectorStoreId,
        currentStep: currentStep || 1,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update session" 
      },
      { status: 500 }
    );
  }
}
