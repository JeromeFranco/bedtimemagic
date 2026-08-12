import OpenAI from "@openai/openai";

export type ConfiguredAiClient<Model extends string = string> = {
  client: OpenAI;
  model: Model;
};

export function createMimoClient(): ConfiguredAiClient<"mimo-v2.5-pro"> {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) throw new Error("MIMO_API_KEY not configured");
  return {
    client: new OpenAI({ apiKey, baseURL: "https://api.xiaomimimo.com/v1" }),
    model: "mimo-v2.5-pro",
  };
}

export function createAiGatewayClient(): ConfiguredAiClient<"bfl/flux-2-klein-4b"> {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not configured");
  return {
    client: new OpenAI({ apiKey, baseURL: "https://ai-gateway.vercel.sh/v1" }),
    model: "bfl/flux-2-klein-4b",
  };
}

export function createDeepSeekClient(): ConfiguredAiClient<"deepseek-v4-flash"> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
  return {
    client: new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" }),
    model: "deepseek-v4-flash",
  };
}
