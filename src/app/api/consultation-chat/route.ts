import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getModel } from "@/config/models";
import { prisma } from "@/lib/prisma";
import { DEEP_RESEARCH_TEMPLATE } from "@/lib/deepResearchTemplate";

const CONSULTATION_SYSTEM_PROMPT = `You are an experienced market research consultant having a casual, collaborative conversation with a marketing strategist. This is a pre-research consultation—think of it as a working session over coffee, not a formal presentation.

IMPORTANT CONTEXT: The "exploration areas" or "categories" they've selected are NOT concrete plans or tactics they're committed to. They're simply interesting strategic directions they want to explore and understand better. Your job is to help them think through what's appealing about these ideas and what they'd want to learn.

Your tone should be:
- **Conversational and natural** - Talk like a real person, not a textbook. Use contractions, casual phrasing, and a friendly tone.
- **Curious and exploratory** - Ask genuine questions about what intrigues them. Show you're thinking through possibilities together.
- **Concise and punchy** - Keep it BRIEF. 1-2 short paragraphs max. Each paragraph should be 2-3 sentences. No more.
- **Direct and practical** - Skip the formalities. Get straight to the interesting questions and ideas.

Your role:
- Help them articulate what's appealing or interesting about different strategic directions
- Explore what they'd want to understand better about these ideas
- Ask ONE focused question per response about appeal, potential, or what they're curious about
- Reference their specific campaign details naturally in conversation

Style guidelines:
- DON'T ask about execution, differentiation, or "how they're planning to" do things—these are explorations, not plans
- DO ask about appeal, potential, what's interesting, what they'd want to learn
- Good questions: "What's the appeal of X?" "What intrigues you about Y?" "What would you want to understand about Z?"
- Bad questions: "How are you planning to differentiate X?" "What's your approach to Y?"
- Avoid formal structures like "Here are a few angles to consider:" or "Would this approach help achieve..."
- Instead, be more natural: "I'm curious what draws you to..." or "What's interesting about..." or "What would you want to learn about..."
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
      let initiationPrompt = `Start this consultation naturally. Look at their campaign and the exploration areas they've selected (remember: these are just ideas they're curious about, not concrete plans).

Open with a warm, conversational greeting. Show you've looked at their work—mention something specific about their objective or what seems interesting about the areas they're exploring. Then ask ONE focused question about what appeals to them or what they'd want to understand better.

Keep it VERY brief—just 1-2 short paragraphs (2-3 sentences each). No lists or formal structures. Talk like you're genuinely interested in helping them explore these ideas.

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

      // Retrieve relevant documents from knowledge hub based on combined context
      let relevantDocs = null;
      console.log('[Consultation] Starting document retrieval...');
      console.log('[Consultation] Context pack exists:', !!contextPack);
      
      // Get brand name from the context pack's session
      let brandName = null;
      if (contextPack) {
        try {
          // The context pack doesn't have a brand field directly, but we can get it from the vector store
          // associated with this session. Let's find the vector store by looking at what was used
          // to create the context pack.
          const contextGen = await prisma.generation.findFirst({
            where: {
              sessionId,
              type: 'context'
            },
            orderBy: { createdAt: 'desc' }
          });
          
          if (contextGen?.brand) {
            brandName = contextGen.brand;
            console.log('[Consultation] Brand from context generation:', brandName);
          }
        } catch (err) {
          console.error('[Consultation] Error getting brand name:', err);
        }
      }
      
      console.log('[Consultation] Brand name for retrieval:', brandName);
      
      if (brandName) {
        try {
          const vectorStore = await prisma.vectorStore.findFirst({
            where: { brand: brandName }
          });

          console.log('[Consultation] Vector store found:', vectorStore ? 'Yes' : 'No');
          console.log('[Consultation] Vector store ID:', vectorStore?.vectorStoreId);

          if (vectorStore?.vectorStoreId) {
            // Build a comprehensive, thematic query that extracts key topics and themes
            // rather than looking for exact matches to exploration categories
            let searchTopics = [];
            let searchContext = [];

            // Extract core themes from the brief
            if (parsedBrief) {
              // Parse objective for key themes (e.g., "STEM toys", "educational influencers")
              const objectiveThemes = parsedBrief.objective.match(/\b(?:STEM|educational?|influencers?|toys?|learning|engagement|community|trust|credibility|brand)\b/gi) || [];
              searchTopics.push(...new Set(objectiveThemes.map(t => t.toLowerCase())));
              
              // Add audience themes
              const audienceThemes = parsedBrief.audience.match(/\b(?:parents?|educators?|teachers?|families|children|students?|learning|educational?)\b/gi) || [];
              searchTopics.push(...new Set(audienceThemes.map(t => t.toLowerCase())));
              
              searchContext.push(`Campaign focus: ${parsedBrief.objective.substring(0, 200)}`);
            }

            // Extract themes from exploration categories (broader concepts, not specific tactics)
            if (explorationCategories && explorationCategories.length > 0) {
              explorationCategories.forEach((cat: any) => {
                // Add category name as a theme
                searchTopics.push(cat.name.toLowerCase());
                
                // Extract key words from subcategories
                if (cat.subcategories) {
                  cat.subcategories.forEach((sub: string) => {
                    const words = sub.match(/\b(?:[A-Z][a-z]+)\b/g) || [];
                    searchTopics.push(...words.map(w => w.toLowerCase()));
                  });
                }
              });
            }

            // Add themes from consultation insights
            if (summaryData.summary?.keyInsights) {
              summaryData.summary.keyInsights.forEach((insight: string) => {
                const themes = insight.match(/\b(?:influencers?|storytelling|engagement|networks?|sharing|family|discussions?|play|content)\b/gi) || [];
                searchTopics.push(...new Set(themes.map(t => t.toLowerCase())));
              });
            }

            // Add research priority themes
            if (summaryData.summary?.researchPriorities) {
              summaryData.summary.researchPriorities.forEach((priority: string) => {
                const themes = priority.match(/\b(?:engagement|sharing|networks?|influencers?|discussions?|perceptions?|educational?|play)\b/gi) || [];
                searchTopics.push(...new Set(themes.map(t => t.toLowerCase())));
              });
            }

            // Add focus area themes
            if (focusAreas && focusAreas.length > 0) {
              searchTopics.push(...focusAreas.map(area => area.toLowerCase()));
            }

            // Deduplicate and create a rich search query
            const uniqueTopics = [...new Set(searchTopics)].filter(t => t.length > 3);
            
            const searchQuery = `Find brand documents, strategies, case studies, and insights related to these themes and topics:

Key Topics: ${uniqueTopics.join(', ')}

Campaign Context:
${searchContext.join('\n')}

Strategic Focus: ${summaryData.summary?.strategicFocus || 'Not specified'}

Research Priorities:
${summaryData.summary?.researchPriorities?.map((p: string) => `- ${p}`).join('\n') || 'None specified'}

Please retrieve any relevant information about:
- Past campaigns or strategies involving these themes
- Audience insights related to these topics
- Performance data or learnings from similar initiatives
- Brand guidelines or positioning related to these areas
- Partnership or collaboration examples
- Content strategies or creative approaches
- Market research or competitive intelligence

Focus on information that would help inform strategic decisions for this campaign, even if it doesn't directly mention the specific exploration ideas.`;

            console.log('[Consultation] Retrieving relevant docs with topics:', uniqueTopics.slice(0, 10).join(', '));

            // Create a thread with file_search to retrieve relevant content
            const thread = await client.beta.threads.create({
              tool_resources: {
                file_search: {
                  vector_store_ids: [vectorStore.vectorStoreId]
                }
              }
            });

            // Add the search query
            await client.beta.threads.messages.create(thread.id, {
              role: "user",
              content: searchQuery
            });

            // Create a temporary assistant for file search
            const assistant = await client.beta.assistants.create({
              name: "Document Retrieval Assistant",
              instructions: "You are a research assistant that extracts relevant information from brand documents based on campaign context. Provide insights and recommendations without citation markers or source references. Focus on actionable insights, strategies, and data points that would inform strategic research.",
              model: "gpt-4o-mini",
              tools: [{ type: "file_search" }]
            });

            // Run with file_search
            const run = await client.beta.threads.runs.createAndPoll(thread.id, {
              assistant_id: assistant.id
            });

            console.log('[Consultation] Run status:', run.status);

            if (run.status === 'completed') {
              const threadMessages = await client.beta.threads.messages.list(thread.id);
              const assistantMessage = threadMessages.data.find(m => m.role === 'assistant');
              
              console.log('[Consultation] Assistant message found:', assistantMessage ? 'Yes' : 'No');
              
              if (assistantMessage?.content[0]?.type === 'text') {
                // Get the raw content and clean up citation markers
                let rawDocs = assistantMessage.content[0].text.value;
                
                // Remove citation markers like 【4:0†source】, 【4:2†source】, etc.
                relevantDocs = rawDocs.replace(/【\d+:\d+†[^】]+】/g, '');
                
                console.log('[Consultation] Retrieved relevant docs length:', relevantDocs.length);
                console.log('[Consultation] Retrieved relevant docs preview:', relevantDocs.substring(0, 200) + '...');
              } else {
                console.log('[Consultation] No text content in assistant message');
              }
            } else {
              console.log('[Consultation] Run did not complete successfully. Status:', run.status);
              if (run.last_error) {
                console.error('[Consultation] Run error:', run.last_error);
              }
            }

            // Clean up the temporary assistant
            try {
              await client.beta.assistants.delete(assistant.id);
              console.log('[Consultation] Assistant cleaned up successfully');
            } catch (cleanupErr) {
              console.error('[Consultation] Error cleaning up assistant:', cleanupErr);
            }
          } else {
            console.log('[Consultation] No vector store found for brand:', brandName);
          }
        } catch (err) {
          console.error('[Consultation] Error retrieving relevant docs:', err);
          console.error('[Consultation] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
          // Continue without relevant docs if retrieval fails
        }
      } else {
        console.log('[Consultation] No brand name available for document retrieval');
        console.log('[Consultation] Context pack exists:', !!contextPack);
      }

      // Build the full deep research prompt
      const deepResearchPrompt = `# Deep Research Context

## Your Task
You are a **Strategic Researcher** conducting comprehensive research for the given brand and campaign. Use the supplied datasets to inform your research and strategic recommendations.

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

${relevantDocs ? `
**RELEVANT BRAND INTELLIGENCE**
The following information was retrieved from the brand's knowledge hub based on the campaign context and exploration areas. Use this to inform your strategic recommendations:

${relevantDocs}
` : ''}`;

      // Build the comprehensive research package
      const researchPackage = {
        summary: summaryData.summary,
        deepResearchPrompt: deepResearchPrompt,
        focusAreas: focusAreas || [],
        relevantDocs: relevantDocs || null,
        data: {
          contextPack: contextPackJson,
          strategyBrief: strategyBriefJson,
          explorationCategories: explorationCategoriesJson,
          consultationChat: consultationChatJson
        }
      };

      // Save comprehensive research package to database
      // Delete any existing research-context generations for this session first
      try {
        await prisma.generation.deleteMany({
          where: {
            sessionId,
            type: 'research-context'
          }
        });

        await prisma.generation.create({
          data: {
            sessionId,
            brand: null,
            type: 'research-context',
            content: JSON.stringify(researchPackage),
            step: 4
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
