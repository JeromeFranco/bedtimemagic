import OpenAI from "@openai/openai";

export const AI_MODELS = {
  story: "mimo-v2.5-pro",
  coverImage: "bfl/flux-2-klein-4b",
} as const;

export type ConfiguredAiClient<Model extends string = string> = {
  client: OpenAI;
  model: Model;
};

export function createMimoClient(): ConfiguredAiClient<typeof AI_MODELS.story> {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) throw new Error("MIMO_API_KEY not configured");
  return {
    client: new OpenAI({ apiKey, baseURL: "https://api.xiaomimimo.com/v1" }),
    model: AI_MODELS.story,
  };
}

export function createAiGatewayClient(): ConfiguredAiClient<typeof AI_MODELS.coverImage> {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");
  return {
    client: new OpenAI({ apiKey, baseURL: "https://ai-gateway.vercel.sh/v1" }),
    model: AI_MODELS.coverImage,
  };
}
