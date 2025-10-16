import { getOpenAIClient } from "./openai";
import { prisma } from "./prisma";

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

    console.log("[createOrGetStore] Creating new vector store in OpenAI");
    
    // Create a new vector store using the REST API
    const client = getOpenAIClient();
    
    // Vector Stores API is at the top level in SDK v6+
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
  for (const file of files) {
    try {
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
 * Fetches real-time status from OpenAI API and merges with our database metadata.
 * 
 * @param storeId - The OpenAI vector store ID
 * @returns Promise with array of files and their metadata
 */
export async function listFiles(storeId: string) {
  const client = getOpenAIClient();

  // Get the vector store record from our database
  const vectorStore = await prisma.vectorStore.findFirst({
    where: { vectorStoreId: storeId },
    include: {
      files: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!vectorStore) {
    return [];
  }

  // Fetch actual file statuses from OpenAI
  try {
    const openAIFiles = await client.vectorStores.files.list(storeId);
    
    // Create a map of fileId -> file info from OpenAI
    const fileInfoMap = new Map<string, any>();
    for (const file of openAIFiles.data) {
      fileInfoMap.set(file.id, file);
    }

    // Fetch detailed file info for each file to get filename and size
    const filesWithDetails = await Promise.all(
      vectorStore.files.map(async (file) => {
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
    // Fallback to database status if OpenAI API fails
    return vectorStore.files.map((file) => ({
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
