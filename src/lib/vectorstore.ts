import { getOpenAIClient } from "./openai";
import { prisma } from "./prisma";
import { convertToJSON, needsConversion } from "./fileConverter";

/**
 * Creates a new vector store or retrieves an existing one for a brand.
 * Uses the Vector Stores API with the assistants=v2 beta header.
 * 
 * @param brand - The brand name (e.g., "DemoCo")
 * @returns Promise with the vector store ID
 */
export async function createOrGetStore(brand: string): Promise<{ id: string }> {
  try {
    console.log("[createOrGetStore] Starting for brand:", brand);
    
    // Check if we already have a vector store for this brand
    const existing = await prisma.vectorStore.findUnique({
      where: { brand }
    });

    if (existing) {
      console.log("[createOrGetStore] Found existing store:", existing.vectorStoreId);
      return { id: existing.vectorStoreId };
    }

    const client = getOpenAIClient();

    // Auto-discovery: Search OpenAI for existing vector stores by name
    console.log("[createOrGetStore] Searching OpenAI for existing vector store...");
    const allStores = await client.vectorStores.list({ limit: 100 });
    const matchingStore = allStores.data.find(
      store => store.name === `${brand} Knowledge Base`
    );

    if (matchingStore) {
      console.log("[createOrGetStore] Found existing vector store in OpenAI:", matchingStore.id);
      
      // Sync to database
      await prisma.vectorStore.create({
        data: {
          brand,
          vectorStoreId: matchingStore.id
        }
      });

      console.log("[createOrGetStore] Synced to database");
      return { id: matchingStore.id };
    }

    console.log("[createOrGetStore] Creating new vector store in OpenAI");
    
    // Create a new vector store using the REST API
    const vectorStore = await client.vectorStores.create({
      name: `${brand} Knowledge Base`
    });

    console.log("[createOrGetStore] Vector store created:", vectorStore.id);

    // Persist to database
    await prisma.vectorStore.create({
      data: {
        brand,
        vectorStoreId: vectorStore.id
      }
    });

    console.log("[createOrGetStore] Saved to database");

    return { id: vectorStore.id };
  } catch (error) {
    console.error("[createOrGetStore] Error:", error);
    throw error;
  }
}

/**
 * Uploads multiple files to an OpenAI vector store with metadata.
 * First uploads files to OpenAI, then attaches them to the vector store with attributes.
 * 
 * @param storeId - The OpenAI vector store ID
 * @param files - Array of File objects to upload
 * @param meta - Metadata to attach to files as attributes
 * @returns Promise that resolves when upload is complete
 */
export async function uploadFiles(
  storeId: string,
  files: File[],
  meta: Record<string, string>
): Promise<void> {
  const client = getOpenAIClient();

  // Get the vector store record from our database
  const vectorStore = await prisma.vectorStore.findFirst({
    where: { vectorStoreId: storeId }
  });

  if (!vectorStore) {
    throw new Error(`Vector store ${storeId} not found in database`);
  }

  // Upload each file and attach to vector store
  for (let file of files) {
    try {
      // Convert CSV/Excel files to JSON if needed
      const originalFileName = file.name;
      if (needsConversion(file)) {
        console.log("[uploadFiles] Converting file to JSON:", file.name);
        file = await convertToJSON(file);
        console.log("[uploadFiles] Converted to:", file.name);
      }

      // Step 1: Upload file to OpenAI
      const uploadedFile = await client.files.create({
        file: file,
        purpose: "assistants"
      });

      console.log("[uploadFiles] Uploaded file:", uploadedFile.id);

      // Step 2: Attach file to vector store with attributes
      const vectorStoreFile = await client.vectorStores.files.create(
        storeId,
        {
          file_id: uploadedFile.id,
          attributes: meta as Record<string, string | number | boolean>
        }
      );

      console.log("[uploadFiles] Attached to vector store:", vectorStoreFile.id);

      // Step 3: Store metadata in our database
      await prisma.fileMetadata.create({
        data: {
          vectorStoreId: vectorStore.id,
          fileId: uploadedFile.id,
          docType: meta.doc_type || "UNKNOWN",
          brand: meta.brand,
          title: meta.title || file.name || "Untitled",
          effectiveDate: meta.effective_date,
          status: vectorStoreFile.status
        }
      });

      console.log("[uploadFiles] Saved metadata to database");
    } catch (error) {
      console.error("[uploadFiles] Error uploading file:", file.name, error);
      throw error;
    }
  }
}

/**
 * Lists all files in a vector store with their metadata.
 * Syncs files from OpenAI to local database (sync-on-read pattern).
 * OpenAI is the source of truth - any files in OpenAI but not in DB will be synced.
 * 
 * @param storeId - The OpenAI vector store ID
 * @returns Promise with array of files and their metadata
 */
export async function listFiles(storeId: string) {
  const client = getOpenAIClient();

  // Get the vector store record from our database
  const vectorStore = await prisma.vectorStore.findFirst({
    where: { vectorStoreId: storeId }
  });

  if (!vectorStore) {
    return [];
  }

  // Fetch ALL files from OpenAI (source of truth)
  try {
    const openAIFiles = await client.vectorStores.files.list(storeId);
    
    console.log(`[listFiles] Found ${openAIFiles.data.length} files in OpenAI vector store`);

    // Sync: Ensure all OpenAI files exist in our database
    for (const openAIFile of openAIFiles.data) {
      const exists = await prisma.fileMetadata.findFirst({
        where: { fileId: openAIFile.id }
      });

      if (!exists) {
        console.log(`[listFiles] Syncing missing file to DB: ${openAIFile.id}`);
        
        // Extract metadata from OpenAI attributes
        const attrs = (openAIFile as any).attributes || {};
        
        // Fetch file details to get filename
        let filename = "Unknown";
        try {
          const fileDetails = await client.files.retrieve(openAIFile.id);
          filename = fileDetails.filename || "Unknown";
        } catch (error) {
          console.error(`[listFiles] Could not retrieve file details for ${openAIFile.id}:`, error);
        }

        // Create database record with metadata from OpenAI attributes
        await prisma.fileMetadata.create({
          data: {
            vectorStoreId: vectorStore.id,
            fileId: openAIFile.id,
            docType: attrs.doc_type || "UNKNOWN",
            brand: attrs.brand || vectorStore.brand,
            title: attrs.title || filename,
            effectiveDate: attrs.effective_date,
            status: openAIFile.status
          }
        });

        console.log(`[listFiles] Synced file ${openAIFile.id} to database`);
      }
    }

    // Now fetch updated database records
    const updatedVectorStore = await prisma.vectorStore.findFirst({
      where: { vectorStoreId: storeId },
      include: {
        files: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!updatedVectorStore) {
      return [];
    }

    // Create a map of fileId -> file info from OpenAI
    const fileInfoMap = new Map<string, any>();
    for (const file of openAIFiles.data) {
      fileInfoMap.set(file.id, file);
    }

    // Build response with merged data
    const filesWithDetails = await Promise.all(
      updatedVectorStore.files.map(async (file) => {
        const openAIFile = fileInfoMap.get(file.fileId);
        
        // Try to get the original file details
        let filename = file.title || "Unknown";
        let size = 0;
        
        try {
          const fileDetails = await client.files.retrieve(file.fileId);
          filename = fileDetails.filename || file.title || "Unknown";
          size = fileDetails.bytes || 0;
        } catch (error) {
          console.error(`[listFiles] Could not retrieve file details for ${file.fileId}:`, error);
        }

        return {
          id: file.fileId,
          filename,
          size,
          status: openAIFile?.status || file.status,
          createdAt: Math.floor(file.createdAt.getTime() / 1000),
          metadata: {
            doc_type: file.docType,
            brand: file.brand,
            title: file.title || undefined,
            effective_date: file.effectiveDate || undefined
          }
        };
      })
    );

    return filesWithDetails;
  } catch (error) {
    console.error('[listFiles] Error fetching from OpenAI:', error);
    
    // Fallback to database-only if OpenAI API fails
    const fallbackStore = await prisma.vectorStore.findFirst({
      where: { vectorStoreId: storeId },
      include: {
        files: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!fallbackStore) {
      return [];
    }

    return fallbackStore.files.map((file) => ({
      id: file.fileId,
      filename: file.title || "Unknown",
      size: 0,
      status: file.status,
      createdAt: Math.floor(file.createdAt.getTime() / 1000),
      metadata: {
        doc_type: file.docType,
        brand: file.brand,
        title: file.title || undefined,
        effective_date: file.effectiveDate || undefined
      }
    }));
  }
}

/**
 * Deletes a file from the vector store and database.
 * 
 * @param fileId - The OpenAI file ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFile(fileId: string): Promise<void> {
  const client = getOpenAIClient();

  try {
    // Find the file in our database to get the vector store ID
    const fileMetadata = await prisma.fileMetadata.findFirst({
      where: { fileId },
      include: { vectorStore: true }
    });

    if (!fileMetadata) {
      throw new Error(`File ${fileId} not found in database`);
    }

    if (!fileMetadata.vectorStore) {
      throw new Error(`Vector store relation not loaded for file ${fileId}`);
    }

    console.log("[deleteFile] Deleting file:", fileId);
    console.log("[deleteFile] From vector store:", fileMetadata.vectorStore.vectorStoreId);

    // Delete file from vector store (this removes it from the vector store but doesn't delete the file itself)
    try {
      // The SDK method signature: vectorStores.files.del(vector_store_id, file_id)
      // @ts-ignore - TypeScript types may be incomplete
      await client.vectorStores.files.del(
        fileMetadata.vectorStore.vectorStoreId,
        fileId
      );
      console.log("[deleteFile] Removed from vector store");
    } catch (error: any) {
      console.error("[deleteFile] Error removing from vector store:", error);
      // Continue with database deletion even if OpenAI API fails
    }
    
    // Delete from our database
    await prisma.fileMetadata.delete({
      where: { id: fileMetadata.id }
    });

    console.log("[deleteFile] Removed from database");
  } catch (error) {
    console.error("[deleteFile] Error deleting file:", fileId, error);
    throw error;
  }
}
