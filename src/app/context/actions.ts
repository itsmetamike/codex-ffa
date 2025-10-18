"use server";

import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { ContextPackSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Document type categories for Context Pack retrieval
const DOC_TYPE_CATEGORIES = {
  brand: ["BRAND_VOICE", "BRAND_KIT", "BRAND_GUIDELINES", "BRAND_SAFETY_GUIDELINES", "VISUAL_IDENTITY", "TONE_OF_VOICE"],
  audience: ["PERSONA", "AUDIENCE_INSIGHTS", "CUSTOMER_RESEARCH", "SEGMENTATION_STUDY"],
  performance: ["MMM_RESULT", "CAMPAIGN_PERFORMANCE", "ATTRIBUTION_ANALYSIS", "MARKET_RESEARCH", "COMPETITIVE_ANALYSIS"],
  creative: ["CREATIVE_BEST_PRACTICES", "CREATIVE_LESSONS", "CONTENT_STRATEGY", "MESSAGING_FRAMEWORK", "CAMPAIGN_BRIEF"],
  strategy: ["MARKETING_STRATEGY", "CHANNEL_STRATEGY", "MEDIA_PLAN", "BUDGET_ALLOCATION"],
  other: ["PRODUCT_INFO", "CASE_STUDY", "OTHER"]
};

export async function buildContextPackAction({
  vectorStoreId,
  sessionId
}: {
  vectorStoreId: string;
  sessionId: string;
}): Promise<
  | { success: true; data: z.infer<typeof ContextPackSchema>; sources: string[] }
  | { success: false; error: string }
> {
  try {
    if (!vectorStoreId || vectorStoreId.trim().length === 0) {
      return { success: false, error: "Vector store ID is required" };
    }

    if (!sessionId || sessionId.trim().length === 0) {
      return { success: false, error: "Session ID is required" };
    }

    const client = getOpenAIClient();
    const model = getModel("SYNTHESIS_MODEL");

    // Create a thread with the file_search tool
    const thread = await client.beta.threads.create();

    // Build the prompt with document type categories
    const allDocTypes = Object.values(DOC_TYPE_CATEGORIES).flat();
    const docTypesString = allDocTypes.map(dt => `"${dt}"`).join(", ");

    // Add the user message
    await client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analyze and synthesize ALL available brand intelligence from EVERY document in the vector store.

Document Types to Query:
${docTypesString}

Categories:
- Brand & Identity: ${DOC_TYPE_CATEGORIES.brand.join(", ")}
- Audience & Personas: ${DOC_TYPE_CATEGORIES.audience.join(", ")}
- Performance & Analytics: ${DOC_TYPE_CATEGORIES.performance.join(", ")}
- Creative & Content: ${DOC_TYPE_CATEGORIES.creative.join(", ")}
- Strategy & Planning: ${DOC_TYPE_CATEGORIES.strategy.join(", ")}

CRITICAL INSTRUCTIONS:
1. Search through ALL documents in the vector store - do not stop after finding a few relevant documents
2. Extract comprehensive information from every available source
3. Generate extensive, detailed bullet points for each section
4. Each bullet should be self-contained and NOT include file citations or source references
5. Aim for AT LEAST 10 bullets per array section (key_insights, creative_lessons, strategy_highlights, risks_or_cautions)
6. If there truly is less content available, that's acceptable, but prioritize thoroughness
7. You must return ONLY valid JSON - no markdown, explanations, or text outside the JSON object

Return this exact JSON structure (all fields are required):
{
  "brand_voice": "string - comprehensive summary of brand voice, tone, personality, and communication style",
  "visual_identity": "string - comprehensive summary of visual identity, design principles, color palettes, typography, and aesthetic guidelines", 
  "audience_summary": "string - comprehensive summary of target audience, demographics, psychographics, behaviors, and preferences",
  "key_insights": ["insight 1", "insight 2", "insight 3", "...", "at least 10 insights if available"],
  "creative_lessons": ["lesson 1", "lesson 2", "lesson 3", "...", "at least 10 lessons if available"],
  "strategy_highlights": ["highlight 1", "highlight 2", "highlight 3", "...", "at least 10 highlights if available"],
  "budget_notes": "string or null - comprehensive budget information if available",
  "risks_or_cautions": ["risk 1", "risk 2", "risk 3", "...", "at least 10 risks/cautions if available"],
  "guardrails": [{"bullet": "specific constraint", "source": "Exact_Filename.pdf"}]
}

Rules:
- All string values must be properly escaped (use \\" for quotes inside strings)
- Arrays should contain AT LEAST 10 items when sufficient content exists (minimum 1 item required)
- Each bullet point should be detailed and self-contained WITHOUT file citations (except guardrails which MUST include source)
- budget_notes can be a string or null
- guardrails array contains objects with "bullet" (constraint text) and "source" (exact filename)
- Extract ONLY safety, legal, compliance constraints for guardrails (NOT business metrics or strategy)
- No trailing commas
- No comments
- No markdown code blocks`
    });

    // Create a run with file_search tool and vector store
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: await getOrCreateContextAssistant(client, model, vectorStoreId),
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

    // Extract file citations/sources
    const sources: string[] = [];
    if (textContent.text.annotations) {
      for (const annotation of textContent.text.annotations) {
        if (annotation.type === "file_citation" && annotation.file_citation) {
          try {
            const file = await client.files.retrieve(annotation.file_citation.file_id);
            if (file.filename && !sources.includes(file.filename)) {
              sources.push(file.filename);
            }
          } catch (err) {
            console.error("Error retrieving file:", err);
          }
        }
      }
    }

    // Parse JSON response
    let parsed: unknown;
    try {
      // Try multiple extraction strategies
      let jsonText = responseText;
      
      // Strategy 1: Extract from markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        // Strategy 2: Find JSON object in the text
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonText = objectMatch[0];
        } else {
          // Strategy 3: Try to clean up the text
          jsonText = responseText.trim();
          // Remove any leading/trailing non-JSON text
          const firstBrace = jsonText.indexOf('{');
          const lastBrace = jsonText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
          }
        }
      }
      
      console.log("[Context Pack] Attempting to parse JSON, length:", jsonText.length);
      console.log("[Context Pack] First 500 chars:", jsonText.substring(0, 500));
      console.log("[Context Pack] Last 500 chars:", jsonText.substring(Math.max(0, jsonText.length - 500)));
      
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("[Context Pack] JSON parsing error:", parseError);
      console.error("[Context Pack] Full response text:", responseText);
      return {
        success: false,
        error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : "Unknown error"}. Please try again.`
      };
    }

    // Validate the response
    const validated = ContextPackSchema.parse(parsed);

    // Save to database
    await (prisma as any).contextPack.create({
      data: {
        sessionId,
        brandVoice: validated.brand_voice,
        visualIdentity: validated.visual_identity,
        audienceSummary: validated.audience_summary,
        keyInsights: JSON.stringify(validated.key_insights),
        creativeLessons: JSON.stringify(validated.creative_lessons),
        strategyHighlights: JSON.stringify(validated.strategy_highlights),
        budgetNotes: validated.budget_notes,
        risksOrCautions: JSON.stringify(validated.risks_or_cautions),
        sources: JSON.stringify(sources)
      }
    });

    // Save guardrails to separate table if any exist
    if (validated.guardrails && validated.guardrails.length > 0) {
      await (prisma as any).guardrail.deleteMany({ where: { sessionId } });
      await (prisma as any).guardrail.createMany({
        data: validated.guardrails.map((item: any) => ({
          sessionId,
          category: item.source,
          summary: item.bullet
        }))
      });
    }

    return { success: true, data: validated, sources };
  } catch (error) {
    console.error("Error building context pack:", error);
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

// Helper function to create context pack assistant
async function getOrCreateContextAssistant(
  client: ReturnType<typeof getOpenAIClient>,
  model: string,
  vectorStoreId: string
) {
  const assistant = await client.beta.assistants.create({
    name: "Context Pack Builder",
    instructions: `You are an expert brand intelligence synthesizer that creates comprehensive Context Packs from document repositories.

CORE RESPONSIBILITIES:
1. Search through ALL documents in the vector store systematically - never stop after finding just a few relevant documents
2. Extract and synthesize information from EVERY available source across all document types
3. Generate extensive, detailed insights that provide maximum value to marketing teams
4. Create self-contained bullet points that do NOT include file citations or source references within the bullet text
5. Prioritize comprehensiveness and depth over brevity

SEARCH STRATEGY (MUST FOLLOW):
1. Query the vector store for each document type category systematically
2. Review brand guidelines, audience research, performance data, creative documentation, and strategic plans
3. Extract insights from multiple documents, not just the top-ranked results
4. Synthesize information across sources to create comprehensive summaries
5. Ensure your output reflects the full breadth of available knowledge

OUTPUT REQUIREMENTS:
- Generate AT LEAST 10 bullet points per array section when sufficient content exists
- Each bullet should be detailed, specific, and actionable
- Do NOT include file citations or source references in the bullet text itself (EXCEPT for guardrails)
- Bullets should be self-contained and immediately useful
- Prioritize unique, non-redundant insights
- For text summaries (brand_voice, visual_identity, audience_summary), provide comprehensive multi-sentence descriptions

GUARDRAILS EXTRACTION (CRITICAL):
- Search for brand safety guidelines, legal requirements, platform policies, compliance documents
- Extract ONLY constraints, restrictions, prohibitions, and mandatory requirements
- DO NOT include business metrics, KPIs, performance data, or strategic recommendations
- Each guardrail MUST include the exact source filename
- Format: [{"bullet": "Must comply with FTC disclosure requirements", "source": "Legal_Guidelines.pdf"}]

You must respond with valid JSON only, following the exact structure provided in the user message.`,
    model,
    tools: [{ type: "file_search" }],
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId]
      }
    },
    response_format: { type: "json_object" }
  });

  return assistant.id;
}
