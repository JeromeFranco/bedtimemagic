import OpenAI from "@openai/openai";

export function createMimoClient(): OpenAI {
  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) throw new Error("MIMO_API_KEY not configured");
  return new OpenAI({ apiKey, baseURL: "https://api.xiaomimimo.com/v1" });
}
