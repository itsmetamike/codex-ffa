import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";
import { DEEP_RESEARCH_TEMPLATE } from "@/lib/deepResearchTemplate";

const CONSULTATION_SYSTEM_PROMPT = `You are an experienced market research consultant having a casual, collaborative conversation with a marketing strategist. This is a pre-research consultation—think of it as a working session over coffee, not a formal presentation.

Your tone should be:
- **Conversational and natural** - Talk like a real person, not a textbook. Use contractions, casual phrasing, and a friendly tone.
- **Curious and collaborative** - Ask genuine questions. Show you're thinking through this together.
- **Concise and punchy** - Keep it BRIEF. 1-2 short paragraphs max. Each paragraph should be 2-3 sentences. No more.
- **Direct and practical** - Skip the formalities. Get straight to the interesting questions and ideas.

Your role:
- Help them think through what they really need to research
- Bounce ideas around and explore angles they might not have considered
- Ask ONE focused follow-up question per response
- Reference their specific campaign details naturally in conversation

Style guidelines:
- Avoid formal structures like "Here are a few angles to consider:" or "Would this approach help achieve..."
- Instead, be more natural: "I'm curious about..." or "What if you..." or "Have you thought about..."
- Don't use bullet points or numbered lists—just talk it through
- Keep it human and engaging, like you're genuinely interested in their project
- CRITICAL: Be brief. Don't ask multiple questions in one response. Pick the ONE most important thing to explore.

At the end of the conversation, you'll synthesize the key research topic that emerged from your discussion.`;

const RESEARCH_CONTEXT_PROMPT = `Based on the conversation history, synthesize the key strategic insights and priorities that emerged from the consultation.

Return ONLY a JSON object with this structure:
{
  "summary": {
    "strategicFocus": "The primary strategic question or opportunity (2-3 sentences)",
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
    "researchPriorities": ["Priority 1", "Priority 2", "Priority 3"]
  }
}

Do not include any markdown formatting or additional text. Return only the raw JSON object.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages, action, focusAreas } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();

    // Handle conversation initiation
    if (action === "initiate") {
      const model = getModel("CREATIVE_MODEL");

      // Fetch all context
      let contextPack = null;
      try {
        contextPack = await (prisma as any).contextPack.findFirst({
          where: { sessionId },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err) {
        console.log("[Consultation] No context pack found");
      }

      let parsedBrief = null;
      try {
        const session = await (prisma as any).session.findUnique({
          where: { id: sessionId }
        });
        if (session?.parsedBrief) {
          parsedBrief = typeof session.parsedBrief === 'string' 
            ? JSON.parse(session.parsedBrief) 
            : session.parsedBrief;
        }
      } catch (err) {
        console.log("[Consultation] No parsed brief found");
      }

      let explorationCategories = null;
      try {
        const selectionGen = await (prisma as any).generation.findFirst({
          where: { 
            sessionId,
            type: 'exploration-selection'
          },
          orderBy: { createdAt: 'desc' }
        });
        if (selectionGen?.content) {
          const content = typeof selectionGen.content === 'string'
            ? JSON.parse(selectionGen.content)
            : selectionGen.content;
          explorationCategories = content.categories;
        }
      } catch (err) {
        console.log("[Consultation] No exploration categories found");
      }

      // Build initiation prompt
      let initiationPrompt = `Start this consultation naturally. Look at their campaign and the exploration areas they've picked, then open with a warm, conversational greeting.

Show you've looked at their work—mention something specific about their objective or the areas they want to explore. Then ask ONE focused question to understand what they're most curious about.

Keep it VERY brief—just 1-2 short paragraphs (2-3 sentences each). No lists or formal structures. Talk like you're genuinely interested in helping them figure this out.

CAMPAIGN CONTEXT:\n\n`;

      if (parsedBrief) {
        initiationPrompt += `Campaign Objective: ${parsedBrief.objective}\n`;
        initiationPrompt += `Target Audience: ${parsedBrief.audience}\n`;
        
        if (parsedBrief.timing) {
          initiationPrompt += `Timing: ${parsedBrief.timing}\n`;
        }
        
        if (parsedBrief.budget) {
          initiationPrompt += `Budget: ${parsedBrief.budget}\n`;
        }
        
        if (parsedBrief.kpis && Array.isArray(parsedBrief.kpis) && parsedBrief.kpis.length > 0) {
          initiationPrompt += `KPIs: ${parsedBrief.kpis.join('; ')}\n`;
        }
        
        if (parsedBrief.constraints && Array.isArray(parsedBrief.constraints) && parsedBrief.constraints.length > 0) {
          initiationPrompt += `Constraints: ${parsedBrief.constraints.join('; ')}\n`;
        }
        
        initiationPrompt += `\n`;
      }

      if (explorationCategories && explorationCategories.length > 0) {
        initiationPrompt += `Selected Exploration Areas:\n`;
        explorationCategories.forEach((cat: any) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            initiationPrompt += `- ${cat.name}: ${cat.subcategories.join(', ')}\n`;
          }
        });
        initiationPrompt += `\n`;
      }

      if (contextPack) {
        initiationPrompt += `Brand Voice: ${contextPack.brandVoice}\n`;
        initiationPrompt += `Visual Identity: ${contextPack.visualIdentity}\n`;
        
        const keyInsights = JSON.parse(contextPack.keyInsights || '[]');
        if (keyInsights.length > 0) {
          initiationPrompt += `Key Performance Insights: ${keyInsights.join('; ')}\n`;
        }
        
        const creativeLessons = JSON.parse(contextPack.creativeLessons || '[]');
        if (creativeLessons.length > 0) {
          initiationPrompt += `Creative Lessons: ${creativeLessons.join('; ')}\n`;
        }
        
        const strategyHighlights = JSON.parse(contextPack.strategyHighlights || '[]');
        if (strategyHighlights.length > 0) {
          initiationPrompt += `Strategy Highlights: ${strategyHighlights.join('; ')}\n`;
        }
        
        initiationPrompt += `\n`;
      }

      const response = await client.responses.create({
        model,
        instructions: CONSULTATION_SYSTEM_PROMPT,
        input: initiationPrompt,
        max_output_tokens: 500
      });

      const assistantMessage = response.output_text;

      if (!assistantMessage) {
        return NextResponse.json(
          { success: false, error: "No response from AI model" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: assistantMessage
      });
    }

    // Handle topic extraction
    if (action === "extract_topics") {
      if (!messages || messages.length === 0) {
        return NextResponse.json(
          { success: false, error: "No conversation history to extract topics from" },
          { status: 400 }
        );
      }

      // Fetch all context to package with the research topic
      let contextPack = null;
      try {
        contextPack = await (prisma as any).contextPack.findFirst({
          where: { sessionId },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err) {
        console.log("[Topic Extraction] No context pack found");
      }

      let parsedBrief = null;
      try {
        const session = await (prisma as any).session.findUnique({
          where: { id: sessionId }
        });
        if (session?.parsedBrief) {
          parsedBrief = typeof session.parsedBrief === 'string' 
            ? JSON.parse(session.parsedBrief) 
            : session.parsedBrief;
        }
      } catch (err) {
        console.log("[Topic Extraction] No parsed brief found");
      }

      let explorationCategories = null;
      try {
        const selectionGen = await (prisma as any).generation.findFirst({
          where: { 
            sessionId,
            type: 'exploration-selection'
          },
          orderBy: { createdAt: 'desc' }
        });
        if (selectionGen?.content) {
          const content = typeof selectionGen.content === 'string'
            ? JSON.parse(selectionGen.content)
            : selectionGen.content;
          explorationCategories = content.categories;
        }
      } catch (err) {
        console.log("[Topic Extraction] No exploration categories found");
      }

      const model = getModel("SYNTHESIS_MODEL");
      
      const conversationSummary = messages
        .map((m: any) => `${m.role === 'user' ? 'Strategist' : 'Consultant'}: ${m.content}`)
        .join('\n\n');

      const response = await client.responses.create({
        model,
        instructions: RESEARCH_CONTEXT_PROMPT,
        input: `Conversation:\n\n${conversationSummary}\n\nSynthesize the research context from this discussion and return it as JSON.`,
        text: {
          format: { type: "json_object" }
        }
      });

      const content = response.output_text;
      if (!content) {
        return NextResponse.json(
          { success: false, error: "No response from AI model" },
          { status: 500 }
        );
      }

      let summaryData;
      try {
        summaryData = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse research context response:", content);
        return NextResponse.json(
          { success: false, error: "Failed to parse AI response" },
          { status: 500 }
        );
      }

      // Prepare data objects for the prompt
      const contextPackJson = contextPack ? {
        brandVoice: contextPack.brandVoice,
        visualIdentity: contextPack.visualIdentity,
        audienceSummary: contextPack.audienceSummary,
        keyInsights: JSON.parse(contextPack.keyInsights || '[]'),
        creativeLessons: JSON.parse(contextPack.creativeLessons || '[]'),
        strategyHighlights: JSON.parse(contextPack.strategyHighlights || '[]'),
        budgetNotes: contextPack.budgetNotes,
        risksOrCautions: JSON.parse(contextPack.risksOrCautions || '[]')
      } : null;

      const strategyBriefJson = parsedBrief;
      const explorationCategoriesJson = explorationCategories;
      const consultationChatJson = messages;

      // Build the full deep research prompt
      const deepResearchPrompt = `# Deep Research Ideation Layer — Generalized Prompt (with TOWS, 7S, Three Horizons + Placements/Compliance/AI)

## Role (system)
You are a **Strategic Researcher** embedded in an **ideation layer**. Your job is to generate three distinct, well-researched strategies for the given brand/problem using the supplied datasets. Create **novel but bounded** options with clear differentiation, feasibility, risk controls, measurement plans, and compliance mapping. **Incorporate** TOWS (SO/ST/WO/WT), McKinsey 7S alignment, and Three Horizons classification **for each strategy**. Return **only valid JSON** that conforms exactly to the provided schema. **Do not include chain-of-thought.**

## Inputs (user)
**DATASETS**  
- \`context_pack_json\`: ${JSON.stringify(contextPackJson, null, 2)}
- \`strategy_brief_json\`: ${JSON.stringify(strategyBriefJson, null, 2)}
- \`exploration_categories_json\`: ${JSON.stringify(explorationCategoriesJson, null, 2)}
- \`consultation_chat_json\`: ${JSON.stringify(consultationChatJson, null, 2)}

**CONSULTATION SUMMARY**
${summaryData.summary ? `
Strategic Focus: ${summaryData.summary.strategicFocus}

Key Insights:
${summaryData.summary.keyInsights.map((insight: string) => `- ${insight}`).join('\n')}

Research Priorities:
${summaryData.summary.researchPriorities.map((priority: string) => `- ${priority}`).join('\n')}
` : ''}

${focusAreas && focusAreas.length > 0 ? `
**RESEARCH FOCUS AREAS**
The research should emphasize these strategic angles:
${focusAreas.map((area: string) => `- ${area}`).join('\n')}

Ensure the strategies and recommendations align with these focus areas where applicable.
` : ''}

${DEEP_RESEARCH_TEMPLATE}`;

      // Build the comprehensive research package
      const researchPackage = {
        summary: summaryData.summary,
        deepResearchPrompt: deepResearchPrompt,
        focusAreas: focusAreas || [],
        data: {
          contextPack: contextPackJson,
          strategyBrief: strategyBriefJson,
          explorationCategories: explorationCategoriesJson,
          consultationChat: consultationChatJson
        }
      };

      // Save comprehensive research package to database
      try {
        await (prisma as any).generation.create({
          data: {
            sessionId,
            brand: null,
            type: 'research-context',
            content: JSON.stringify(researchPackage),
            step: 5
          }
        });
      } catch (dbError) {
        console.error("Error saving research context:", dbError);
      }

      return NextResponse.json({
        success: true,
        researchContext: summaryData.summary,
        deepResearchPrompt: deepResearchPrompt,
        researchPackage
      });
    }

    // Handle chat message
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    const model = getModel("CREATIVE_MODEL");

    // Fetch context for the first message
    let contextMessage = "";
    if (messages.length === 1) {
      // Fetch Context Pack
      let contextPack = null;
      try {
        contextPack = await (prisma as any).contextPack.findFirst({
          where: { sessionId },
          orderBy: { createdAt: 'desc' }
        });
      } catch (err) {
        console.log("[Consultation] No context pack found");
      }

      // Fetch Parsed Brief
      let parsedBrief = null;
      try {
        const session = await (prisma as any).session.findUnique({
          where: { id: sessionId }
        });
        if (session?.parsedBrief) {
          parsedBrief = typeof session.parsedBrief === 'string' 
            ? JSON.parse(session.parsedBrief) 
            : session.parsedBrief;
        }
      } catch (err) {
        console.log("[Consultation] No parsed brief found");
      }

      // Fetch exploration categories
      let explorationCategories = null;
      try {
        const selectionGen = await (prisma as any).generation.findFirst({
          where: { 
            sessionId,
            type: 'exploration-selection'
          },
          orderBy: { createdAt: 'desc' }
        });
        if (selectionGen?.content) {
          const content = typeof selectionGen.content === 'string'
            ? JSON.parse(selectionGen.content)
            : selectionGen.content;
          explorationCategories = content.categories;
        }
      } catch (err) {
        console.log("[Consultation] No exploration categories found");
      }

      // Build context
      contextMessage = "\n\n=== CAMPAIGN CONTEXT ===\n\n";

      if (parsedBrief) {
        const kpis = Array.isArray(parsedBrief.kpis) ? parsedBrief.kpis : [];
        const constraints = Array.isArray(parsedBrief.constraints) ? parsedBrief.constraints : [];
        
        contextMessage += `STRATEGY BRIEF:
Objective: ${parsedBrief.objective || 'Not specified'}
Audience: ${parsedBrief.audience || 'Not specified'}
${parsedBrief.timing ? `Timing: ${parsedBrief.timing}\n` : ''}${parsedBrief.budget ? `Budget: ${parsedBrief.budget}\n` : ''}${kpis.length > 0 ? `KPIs: ${kpis.join(', ')}\n` : ''}${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}\n` : ''}
`;
      }

      if (contextPack) {
        contextMessage += `\nBRAND CONTEXT:
Brand Voice: ${contextPack.brandVoice}
Visual Identity: ${contextPack.visualIdentity}
Target Audience: ${contextPack.audienceSummary}
`;

        const keyInsights = JSON.parse(contextPack.keyInsights || '[]');
        if (keyInsights.length > 0) {
          contextMessage += `\nKey Insights: ${keyInsights.join('; ')}`;
        }
      }

      if (explorationCategories && explorationCategories.length > 0) {
        contextMessage += `\n\nSELECTED EXPLORATION AREAS:\n`;
        explorationCategories.forEach((cat: any) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            contextMessage += `${cat.name}: ${cat.subcategories.join(', ')}\n`;
          }
        });
      }

      contextMessage += "\n===\n\nUse this context to inform your consultation, but keep your responses conversational and focused on the strategist's questions and needs.";
    }

    const response = await client.responses.create({
      model,
      instructions: CONSULTATION_SYSTEM_PROMPT + contextMessage,
      input: messages,
      max_output_tokens: 800
    });

    const assistantMessage = response.output_text;

    if (!assistantMessage) {
      return NextResponse.json(
        { success: false, error: "No response from AI model" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage
    });
  } catch (error) {
    console.error("Error in consultation chat:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
