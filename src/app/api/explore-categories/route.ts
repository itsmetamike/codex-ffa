import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";

const EXPLORE_CATEGORIES_PROMPT = `You are a forward-thinking strategic consultant helping an advertiser develop a novel, innovative marketing strategy. Your role is to generate creative exploration areas that could inspire breakthrough strategic directions.

CRITICAL: You MUST base your recommendations on the SPECIFIC Strategy Brief and Context Pack provided. Do not generate generic categories - every category and sub-idea must be directly relevant to:
- The specific brand, its voice, and positioning
- The specific campaign objective stated in the brief
- The specific target audience and their behaviors
- The specific constraints and KPIs mentioned
- The brand's historical performance insights and creative lessons

Your task: Generate 9 high-level strategic opportunity categories, each with 5 specific sub-ideas or exploration angles. These should be:

1. FORWARD-LOOKING: Focus on emerging trends, new opportunities, and novel approaches (NOT historical analysis)
2. BRAND-SPECIFIC: Tailored to this exact brand, audience, and objective
3. RESEARCH-READY: Each subcategory should be a SHORT, CONCISE label (2-5 words maximum) that names a specific idea or angle. Think of them as research topic names, not full descriptions. Examples: "Amazon Store Hub", "TikTok Shop Integration", "AI-Powered Personalization"

Consider areas like:
- Emerging consumer trends and cultural shifts RELEVANT TO THIS AUDIENCE
- Innovative channel and platform opportunities FOR THIS BRAND
- Novel creative approaches and formats ALIGNED WITH THIS OBJECTIVE
- Technology-enabled possibilities (AI, AR/VR, Web3, etc.) THAT FIT THIS CONTEXT
- Cultural moments and movements TO LEVERAGE FOR THIS CAMPAIGN
- Untapped audience segments or behaviors RELATED TO THIS TARGET
- Partnership and collaboration opportunities THAT MAKE SENSE FOR THIS BRAND
- New product or service innovation angles WITHIN THESE CONSTRAINTS
- Disruptive competitive positioning OPPORTUNITIES FOR THIS MARKET

IMPORTANT: Use current market knowledge and emerging trends. Think about what's happening NOW and what's coming NEXT that this specific brand could leverage.

Return ONLY a JSON object with this exact structure:
{
  "categories": [
    {
      "name": "Category Name",
      "subcategories": [
        "Short Label 1",
        "Short Label 2",
        "Short Label 3",
        "Short Label 4",
        "Short Label 5"
      ]
    }
  ]
}

Do not include any markdown formatting, code blocks, or additional text. Return only the raw JSON object.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const model = getModel("CREATIVE_MODEL");

    // Fetch Context Pack
    let contextPack = null;
    try {
      contextPack = await (prisma as any).contextPack.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (err) {
      console.log("[Explore Categories] No context pack found for session:", sessionId);
    }

    // Fetch Parsed Brief
    let parsedBrief = null;
    try {
      const session = await (prisma as any).session.findUnique({
        where: { id: sessionId }
      });
      if (session?.parsedBrief) {
        // Parse the JSON string if it's a string, otherwise use as-is
        parsedBrief = typeof session.parsedBrief === 'string' 
          ? JSON.parse(session.parsedBrief) 
          : session.parsedBrief;
      }
    } catch (err) {
      console.log("[Explore Categories] No parsed brief found for session:", sessionId);
    }

    if (!contextPack && !parsedBrief) {
      return NextResponse.json(
        { success: false, error: "No context pack or strategy brief found. Please complete previous steps first." },
        { status: 400 }
      );
    }

    // Build context message
    let contextMessage = "=== STRATEGIC CONTEXT ===\n\n";

    if (parsedBrief) {
      const kpis = Array.isArray(parsedBrief.kpis) ? parsedBrief.kpis : [];
      const constraints = Array.isArray(parsedBrief.constraints) ? parsedBrief.constraints : [];
      
      contextMessage += `STRATEGY BRIEF:
Objective: ${parsedBrief.objective || 'Not specified'}
Audience: ${parsedBrief.audience || 'Not specified'}
${parsedBrief.timing ? `Timing: ${parsedBrief.timing}\n` : ''}${parsedBrief.budget ? `Budget: ${parsedBrief.budget}\n` : ''}${kpis.length > 0 ? `KPIs:\n${kpis.map((kpi: string) => `- ${kpi}`).join('\n')}\n` : ''}
${constraints.length > 0 ? `Constraints:\n${constraints.map((c: string) => `- ${c}`).join('\n')}\n` : ''}
`;
    }

    if (contextPack) {
      contextMessage += `BRAND CONTEXT PACK:

Brand Voice: ${contextPack.brandVoice}

Visual Identity: ${contextPack.visualIdentity}

Target Audience: ${contextPack.audienceSummary}

Key Performance Insights:
${JSON.parse(contextPack.keyInsights || '[]').map((i: string) => `- ${i}`).join('\n')}

Creative Lessons:
${JSON.parse(contextPack.creativeLessons || '[]').map((l: string) => `- ${l}`).join('\n')}

Strategy Highlights:
${JSON.parse(contextPack.strategyHighlights || '[]').map((s: string) => `- ${s}`).join('\n')}

${contextPack.budgetNotes ? `Budget Notes: ${contextPack.budgetNotes}\n\n` : ''}Risks & Cautions:
${JSON.parse(contextPack.risksOrCautions || '[]').map((r: string) => `- ${r}`).join('\n')}
`;
    }

    contextMessage += `\n===\n\nBased on the SPECIFIC brief and context above, generate 9 innovative strategic opportunity categories with 5 specific sub-ideas each.

REQUIREMENTS:
- Every category and sub-idea must be directly relevant to THIS brand, THIS objective, and THIS audience
- Focus on forward-looking opportunities that leverage current and emerging trends
- Consider what's happening in the market RIGHT NOW that this brand could capitalize on
- Think about novel approaches that would differentiate this campaign from competitors
- Each sub-idea should be a SHORT LABEL (2-5 words) that names a specific research topic
- Subcategories should be concise topic names, NOT full sentences or descriptions

Do NOT generate generic marketing categories. Make them specific to this context.

SUBCATEGORY FORMAT EXAMPLES:
- "Amazon Store Hub" (not "Launch a 'Build Together Hub' on the Amazon Store...")
- "TikTok Shop Integration" (not "Explore TikTok Shop as a new channel...")
- "AI Content Personalization" (not "Use AI to personalize content for users...")
- "Creator Partnership Program" (not "Develop partnerships with micro-influencers...")

Keep subcategories SHORT and PUNCHY.`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: EXPLORE_CATEGORIES_PROMPT },
        { role: "user", content: contextMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 1  // Add variety to responses
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI model" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let categoriesData;
    try {
      categoriesData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate structure
    if (!categoriesData.categories || !Array.isArray(categoriesData.categories)) {
      return NextResponse.json(
        { success: false, error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    // Save to database as a generation using shared logic
    try {
      // Delete existing exploration generation for this session
      await (prisma as any).generation.deleteMany({
        where: {
          sessionId,
          type: 'exploration'
        }
      });

      // Create new generation (matching the pattern from /api/generations/save)
      await (prisma as any).generation.create({
        data: {
          sessionId,
          brand: null,
          type: 'exploration',
          content: JSON.stringify(categoriesData),  // Stringify here like the save endpoint does
          step: 3
        }
      });
    } catch (dbError) {
      console.error("Error saving exploration to database:", dbError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({ 
      success: true, 
      categories: categoriesData.categories 
    });
  } catch (error) {
    console.error("Error generating exploration categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
