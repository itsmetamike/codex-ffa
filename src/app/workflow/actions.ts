"use server";

import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { GuardrailItemSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function summarizeGuardrailsAction({
  brand,
  brief,
  sessionId
}: {
  brand: string;
  brief: string;
  sessionId?: string;
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
      content: `You are analyzing brand safety, legal, and platform constraint documents for a marketing campaign. Your task is to extract ALL SAFETY, LEGAL, and COMPLIANCE constraints that apply to this brief FROM EVERY DOCUMENT in the vector store.

Brief:
${brief}

WHAT TO EXTRACT (CONSTRAINTS ONLY):
✓ Brand safety rules (violence, adult content, political content, etc.)
✓ Legal requirements (COPPA, GDPR, CARU, AVMSD, etc.)
✓ Platform-specific rules (TikTok policies, YouTube policies, Meta policies, Amazon policies, etc.)
✓ Content restrictions (prohibited themes, messaging, imagery)
✓ Compliance requirements (age verification, parental consent, data handling)
✓ Creative restrictions (visual guidelines, messaging dos/don'ts)
✓ Asset requirements (mandatory disclosures, safety icons, labeling)
✓ Prohibited practices (targeting restrictions, data usage limits)

WHAT NOT TO EXTRACT (IGNORE THESE):
✗ Performance metrics (ROAS, CTR, conversion rates, KPIs)
✗ Budget targets or spend goals
✗ Marketing strategy recommendations
✗ Channel mix or media planning
✗ Audience targeting strategies (unless they're restrictions/prohibitions)
✗ Creative best practices (unless they're mandatory requirements)

CRITICAL INSTRUCTIONS:
1. YOU MUST search through EVERY SINGLE document in the vector store - do not stop after finding one relevant document
2. Extract ONLY safety, legal, and compliance constraints from EACH document
3. SKIP any performance metrics, business goals, or strategic recommendations
4. For EACH document you find, extract ALL relevant CONSTRAINTS from it
5. Each constraint should be a rule, restriction, prohibition, or mandatory requirement
6. Always cite the exact source document filename for each constraint

SEARCH STRATEGY:
- First, identify ALL documents in the vector store
- Then, for EACH document, extract only safety/legal/compliance constraints
- Filter out business metrics and strategic advice
- Ensure you've reviewed every document before finalizing your response

Format your response as a JSON array of objects:
[
  {
    "bullet": "Specific safety, legal, or compliance constraint",
    "source": "Exact_Filename.pdf"
  }
]

IMPORTANT: Return a COMPLETE list of CONSTRAINTS ONLY from ALL documents. You should have constraints from MULTIPLE different source files. Aim for at least 15-30 constraints total across all documents. Return ONLY the JSON array, no additional text.`
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

    // Save guardrails to database if sessionId is provided
    if (sessionId && validated.length > 0) {
      try {
        // Delete existing guardrails for this session
        // @ts-expect-error - Prisma types need regeneration
        await (prisma as any).guardrail.deleteMany({
          where: { sessionId }
        });

        // Create new guardrails
        // @ts-expect-error - Prisma types need regeneration
        await (prisma as any).guardrail.createMany({
          data: validated.map((item) => ({
            sessionId,
            category: item.source,
            summary: item.bullet
          }))
        });
      } catch (dbError) {
        console.error("Error saving guardrails to database:", dbError);
        // Don't fail the whole operation if DB save fails
      }
    }

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
    name: "Safety & Compliance Constraint Analyzer",
    instructions: `You are an expert compliance analyst specializing in brand safety, legal constraints, and platform guidelines. Your role is to extract ONLY safety, legal, and compliance CONSTRAINTS from documents - NOT business metrics or strategic advice.

CRITICAL: You MUST search through ALL documents in the vector store, not just the most relevant one.

WHAT YOU EXTRACT (CONSTRAINTS ONLY):
✓ Brand safety rules and prohibitions
✓ Legal requirements and regulations
✓ Platform policy restrictions
✓ Content prohibitions and restrictions
✓ Compliance mandates
✓ Creative restrictions (mandatory requirements)
✓ Required disclosures and labeling
✓ Data handling restrictions

WHAT YOU IGNORE (DO NOT EXTRACT):
✗ Performance metrics (ROAS, CTR, conversion rates)
✗ Business goals or targets
✗ Marketing strategy recommendations
✗ Budget or spend guidance
✗ Best practices (unless mandatory)
✗ Optimization suggestions

CORE RESPONSIBILITIES:
1. Search EVERY document in the vector store systematically
2. For EACH document found, extract ONLY safety/legal/compliance constraints
3. Filter out all business metrics, KPIs, and strategic recommendations
4. Do not stop after finding constraints in one document - continue searching all documents
5. Missing a safety or legal constraint could have serious implications
6. Organize findings by source document to show you've reviewed multiple sources

SEARCH STRATEGY (MUST FOLLOW):
1. First, identify ALL documents available in the vector store
2. Then systematically review EACH document for constraints only:
   - Brand safety guidelines (rules and prohibitions)
   - Platform-specific policies (restrictions and requirements)
   - Legal and compliance documents (regulations and mandates)
   - Creative guidelines (mandatory restrictions only, not suggestions)
   - Content restrictions (prohibitions and limitations)
3. Ensure your final output includes constraints from MULTIPLE different source files

OUTPUT REQUIREMENTS:
- Always cite exact source filenames for each constraint
- Your response should include constraints from MULTIPLE different documents
- Each item must be a constraint, restriction, prohibition, or mandatory requirement
- Aim for comprehensive coverage (15-30+ constraints from multiple sources)
- Prioritize completeness over brevity - extract all relevant constraints`,
    model,
    temperature: 0.0,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId]
      }
    }
  });

  return assistant.id;
}
