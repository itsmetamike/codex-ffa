"use server";

import { getOpenAIClient } from "@/lib/openai";
import { ParsedBriefSchema } from "@/lib/schemas";
import { getModel } from "@/config/models";
import { z } from "zod";

const SYSTEM_PROMPT = `You are a marketing brief parser. Extract structured information from the user's brief text.

Return ONLY valid JSON matching this exact schema:
{
  "objective": "string (required, min 1 char) - main campaign objective",
  "audience": "string (required, min 1 char) - target audience description",
  "timing": "string (optional) - timeline or deadline information",
  "kpis": ["array of strings"] - key performance indicators,
  "constraints": ["array of strings"] - budget, resource, or other constraints
}

Rules:
- Extract information accurately from the brief
- If a field is not mentioned, use empty string for optional fields or empty array for arrays
- Do not add information not present in the brief
- Return ONLY the JSON object, no additional text`;

export async function parseBriefAction(
  text: string,
  vectorStoreId?: string
): Promise<
  | { success: true; data: z.infer<typeof ParsedBriefSchema> }
  | { success: false; error: string }
> {
  try {
    if (!text || text.trim().length === 0) {
      return { success: false, error: "Brief text cannot be empty" };
    }

    const client = getOpenAIClient();
    const model = getModel("INTENT_MODEL");

    // First attempt
    let response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ]
    });

    let content = response.choices[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No response from AI model" };
    }

    // Try to parse and validate
    try {
      const parsed = JSON.parse(content);
      const validated = ParsedBriefSchema.parse(parsed);
      return { success: true, data: validated };
    } catch (firstError) {
      // Auto-retry once on invalid JSON
      console.warn("First parse attempt failed, retrying...", firstError);

      response = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
          {
            role: "assistant",
            content: content
          },
          {
            role: "user",
            content: `The previous response was invalid. Error: ${
              firstError instanceof Error ? firstError.message : "Invalid format"
            }. Please return valid JSON matching the exact schema.`
          }
        ]
      });

      content = response.choices[0]?.message?.content;

      if (!content) {
        return { success: false, error: "No response from AI model on retry" };
      }

      const parsed = JSON.parse(content);
      const validated = ParsedBriefSchema.parse(parsed);
      return { success: true, data: validated };
    }
  } catch (error) {
    console.error("Error parsing brief:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      };
    }
    if (error instanceof SyntaxError) {
      return { success: false, error: "Invalid JSON response from AI model" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}
