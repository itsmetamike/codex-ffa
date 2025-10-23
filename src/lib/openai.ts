import OpenAI from "openai";

let client: OpenAI | null = null;
let deepResearchClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return client;
}

export function getDeepResearchClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!deepResearchClient) {
    deepResearchClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 3600 * 1000 // 1 hour timeout for deep research
    });
  }

  return deepResearchClient;
}
