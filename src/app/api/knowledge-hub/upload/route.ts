import { NextRequest, NextResponse } from "next/server";
import { createOrGetStore, uploadFiles } from "@/lib/vectorstore";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const brand = formData.get("brand") as string;
    const docType = formData.get("doc_type") as string;
    const title = formData.get("title") as string | null;
    const effectiveDate = formData.get("effective_date") as string | null;
    
    if (!brand || !docType) {
      return NextResponse.json(
        { error: "Brand and doc_type are required" },
        { status: 400 }
      );
    }

    // Get all files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    // Create or get the vector store for this brand
    const { id: storeId } = await createOrGetStore(brand);

    // Prepare metadata
    const metadata: Record<string, string> = {
      brand,
      doc_type: docType
    };
    
    if (title) metadata.title = title;
    if (effectiveDate) metadata.effective_date = effectiveDate;

    // Upload files with metadata
    await uploadFiles(storeId, files, metadata);

    return NextResponse.json({
      success: true,
      storeId,
      filesUploaded: files.length
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
