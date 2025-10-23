import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "brand parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[KNOWLEDGE HUB DELETE BRAND API] Deleting all files for brand: ${brand}`);

    // Get the vector store for this brand
    const vectorStore = await prisma.vectorStore.findUnique({
      where: { brand },
      include: { files: true }
    });

    if (!vectorStore) {
      return NextResponse.json(
        { error: `No vector store found for brand "${brand}"` },
        { status: 404 }
      );
    }

    const client = getOpenAIClient();
    const fileIds = vectorStore.files.map(f => f.fileId);
    
    console.log(`[KNOWLEDGE HUB DELETE BRAND API] Found ${fileIds.length} files to delete`);

    // Delete all files from OpenAI
    const deletePromises = fileIds.map(async (fileId) => {
      try {
        await client.files.delete(fileId);
        console.log(`[KNOWLEDGE HUB DELETE BRAND API] Deleted file: ${fileId}`);
      } catch (error) {
        console.error(`[KNOWLEDGE HUB DELETE BRAND API] Error deleting file ${fileId}:`, error);
      }
    });

    await Promise.all(deletePromises);

    // Delete the vector store from OpenAI
    try {
      // @ts-expect-error - OpenAI SDK types may need update
      await client.beta.vectorStores.delete(vectorStore.vectorStoreId);
      console.log(`[KNOWLEDGE HUB DELETE BRAND API] Deleted vector store: ${vectorStore.vectorStoreId}`);
    } catch (error) {
      console.error(`[KNOWLEDGE HUB DELETE BRAND API] Error deleting vector store:`, error);
    }

    // Delete all file metadata from database
    await prisma.fileMetadata.deleteMany({
      where: { vectorStoreId: vectorStore.id }
    });

    // Delete the vector store from database
    await prisma.vectorStore.delete({
      where: { brand }
    });

    console.log(`[KNOWLEDGE HUB DELETE BRAND API] Successfully deleted all data for brand: ${brand}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${fileIds.length} files for brand "${brand}"`,
      deletedFiles: fileIds.length
    });
  } catch (error) {
    console.error("[KNOWLEDGE HUB DELETE BRAND API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete brand files" },
      { status: 500 }
    );
  }
}
