import OpenAI from "@openai/openai";

export const AI_MODELS = {
  story: "mimo-v2.5-pro",
  coverImage: "bfl/flux-2-klein-4b",
} as const;

export function createMimoClient(): OpenAI {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) throw new Error("MIMO_API_KEY not configured");
  return new OpenAI({ apiKey, baseURL: "https://api.xiaomimimo.com/v1" });
}

export function createAiGatewayClient(): OpenAI {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");
  return new OpenAI({ apiKey, baseURL: "https://ai-gateway.vercel.sh/v1" });
}
