export type ModelKey =
  | "INTENT_MODEL"
  | "SYNTHESIS_MODEL"
  | "CREATIVE_MODEL"
  | "SCORING_MODEL"
  | "REASONING_MODEL"
  | "EMBEDDING_MODEL"
  | "DEEP_RESEARCH_MODEL";

type ModelConfig = Record<ModelKey, string>;

const DEFAULT_MODELS: ModelConfig = {
  INTENT_MODEL: "gpt-4o-mini",
  SYNTHESIS_MODEL: "gpt-4o",
  CREATIVE_MODEL: "gpt-4o",
  SCORING_MODEL: "gpt-4o-mini",
  REASONING_MODEL: "o1-preview",
  EMBEDDING_MODEL: "text-embedding-3-large",
  DEEP_RESEARCH_MODEL: "o4-mini-deep-research-2025-06-26"
};

function readEnvModel(key: ModelKey) {
  const envKey = key;
  const publicEnvKey = `NEXT_PUBLIC_${key}`;
  return process.env[envKey] ?? process.env[publicEnvKey] ?? DEFAULT_MODELS[key];
}

export function getModelConfig(): ModelConfig {
  return {
    INTENT_MODEL: readEnvModel("INTENT_MODEL"),
    SYNTHESIS_MODEL: readEnvModel("SYNTHESIS_MODEL"),
    CREATIVE_MODEL: readEnvModel("CREATIVE_MODEL"),
    SCORING_MODEL: readEnvModel("SCORING_MODEL"),
    REASONING_MODEL: readEnvModel("REASONING_MODEL"),
    EMBEDDING_MODEL: readEnvModel("EMBEDDING_MODEL"),
    DEEP_RESEARCH_MODEL: readEnvModel("DEEP_RESEARCH_MODEL")
  };
}

export function getModel(key: ModelKey) {
  return readEnvModel(key);
}
