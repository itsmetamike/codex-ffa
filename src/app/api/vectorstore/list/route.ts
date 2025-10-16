import { NextRequest, NextResponse } from "next/server";
import { createOrGetStore, listFiles } from "@/lib/vectorstore";

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

    console.log("[LIST API] Getting vector store for brand:", brand);

    // Get the vector store for this brand
    const { id: storeId } = await createOrGetStore(brand);

    console.log("[LIST API] Vector store ID:", storeId);

    // List all files in the store
    const files = await listFiles(storeId);

    console.log("[LIST API] Found files:", files.length);

    return NextResponse.json({
      storeId,
      files
    });
  } catch (error) {
    console.error("[LIST API] Error:", error);
    console.error("[LIST API] Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
