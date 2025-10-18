import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/vectorstore";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId parameter is required" },
        { status: 400 }
      );
    }

    console.log("[DELETE API] Deleting file:", fileId);

    // Delete the file
    await deleteFile(fileId);

    console.log("[DELETE API] File deleted successfully");

    return NextResponse.json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("[DELETE API] Error:", error);
    console.error("[DELETE API] Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete file" },
      { status: 500 }
    );
  }
}
