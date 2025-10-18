export type ModelKey =
  | "INTENT_MODEL"
  | "SYNTHESIS_MODEL"
  | "CREATIVE_MODEL"
  | "SCORING_MODEL"
  | "REASONING_MODEL"
  | "EMBEDDING_MODEL";

type ModelConfig = Record<ModelKey, string>;

const DEFAULT_MODELS: ModelConfig = {
  INTENT_MODEL: "gpt-4o-mini",
  SYNTHESIS_MODEL: "gpt-4o",
  CREATIVE_MODEL: "gpt-5",
  SCORING_MODEL: "gpt-4o-mini",
  REASONING_MODEL: "o3-pro",
  EMBEDDING_MODEL: "text-embedding-3-large"
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
    EMBEDDING_MODEL: readEnvModel("EMBEDDING_MODEL")
  };
}

export function getModel(key: ModelKey) {
  return readEnvModel(key);
}
