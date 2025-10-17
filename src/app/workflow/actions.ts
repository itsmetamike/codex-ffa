"use server";

import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { GuardrailItemSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function summarizeGuardrailsAction({
  brand,
  brief
}: {
  brand: string;
  brief: string;
}): Promise<
  | { success: true; data: z.infer<typeof GuardrailItemSchema>[] }
  | { success: false; error: string }
> {
  try {
    if (!brand || brand.trim().length === 0) {
      return { success: false, error: "Brand is required" };
    }

    if (!brief || brief.trim().length === 0) {
      return { success: false, error: "Brief is required" };
    }

    // Fetch the vector store for this brand from the database
    // @ts-ignore - Prisma types need regeneration
    const vectorStore = await prisma.vectorStore.findUnique({
      where: { brand: brand.trim() }
    });

    if (!vectorStore) {
      return {
        success: false,
        error: `No vector store found for brand "${brand}". Please upload documents first at /ingest.`
      };
    }

    const vectorStoreId = vectorStore.vectorStoreId;

    const client = getOpenAIClient();
    const model = getModel("SYNTHESIS_MODEL");

    // Create a thread with the file_search tool
    const thread = await client.beta.threads.create();

    // Add the user message with the brief
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Summarize relevant brand safety, legal, and platform rules for this brief. Return bullets with citations to specific file names.

Brief:
${brief}

Format your response as a JSON array of objects with this structure:
[
  {
    "bullet": "The specific rule or constraint",
    "source": "Filename.pdf"
  }
]

Return ONLY the JSON array, no additional text.`
    });

    // Create a run with file_search tool and vector store
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: await getOrCreateAssistant(client, model, vectorStoreId),
      tools: [{ type: "file_search" }]
    });

    if (run.status !== "completed") {
      return {
        success: false,
        error: `Run failed with status: ${run.status}`
      };
    }

    // Get the assistant's response
    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant" && msg.run_id === run.id
    );

    if (!assistantMessage) {
      return { success: false, error: "No response from assistant" };
    }

    // Extract text content
    const textContent = assistantMessage.content.find(
      (content) => content.type === "text"
    );

    if (!textContent || textContent.type !== "text") {
      return { success: false, error: "No text content in response" };
    }

    const responseText = textContent.text.value;

    // Parse JSON response
    let parsed: unknown;
    try {
      // Try multiple extraction strategies
      let jsonText = responseText;
      
      // Strategy 1: Extract from markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        // Strategy 2: Find JSON array in the text
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          jsonText = arrayMatch[0];
        } else {
          // Strategy 3: Try to clean up the text
          jsonText = responseText.trim();
          // Remove any leading/trailing non-JSON text
          const firstBracket = jsonText.indexOf('[');
          const lastBracket = jsonText.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
            jsonText = jsonText.substring(firstBracket, lastBracket + 1);
          }
        }
      }
      
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parsing error. Response text:", responseText);
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown error"}. Please try again.`
      };
    }

    // Validate the response
    if (!Array.isArray(parsed)) {
      return { success: false, error: "Response is not an array" };
    }

    const validated = parsed.map((item) => GuardrailItemSchema.parse(item));

    return { success: true, data: validated };
  } catch (error) {
    console.error("Error summarizing guardrails:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper function to get or create an assistant with file_search capability
async function getOrCreateAssistant(
  client: ReturnType<typeof getOpenAIClient>,
  model: string,
  vectorStoreId: string
) {
  // For simplicity, create a new assistant each time
  // In production, you might want to cache this
  const assistant = await client.beta.assistants.create({
    name: "Guardrails Summarizer",
    instructions:
      "You are a helpful assistant that summarizes brand safety, legal, and platform constraints from documents. Always cite the source file names.",
    model,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId]
      }
    }
  });

  return assistant.id;
}
