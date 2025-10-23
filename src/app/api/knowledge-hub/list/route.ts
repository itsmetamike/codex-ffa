import { NextRequest, NextResponse } from "next/server";
import { listFiles, createOrGetStore } from "@/lib/vectorstore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "Brand parameter is required" },
        { status: 400 }
      );
    }

    console.log("[KNOWLEDGE HUB LIST API] Getting vector store for brand:", brand);

    // Use createOrGetStore to auto-discover existing vector stores in OpenAI
    const { id: storeId } = await createOrGetStore(brand);
    console.log("[KNOWLEDGE HUB LIST API] Vector store ID:", storeId);

    // List all files in the store (will sync from OpenAI)
    const files = await listFiles(storeId);

    console.log("[KNOWLEDGE HUB LIST API] Found files:", files.length);

    return NextResponse.json({
      storeId,
      files
    });
  } catch (error) {
    console.error("[KNOWLEDGE HUB LIST API] Error:", error);
    console.error("[KNOWLEDGE HUB LIST API] Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
