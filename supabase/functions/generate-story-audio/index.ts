import OpenAI from "@openai/openai";
import { withSupabase, type SupabaseContext } from "@supabase/server";
import { createMimoClient } from "../_shared/openai.ts";

const MODEL = "mimo-v2.5-tts";
const VOICE = "Chloe";
const STYLE = "Gentle, warm, slow-paced bedtime story narrator. Soft and soothing voice, like a caring parent reading to a child at night.";
const MAX_WORDS = 5000;

async function generateAudio(storyText: string, client: OpenAI): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "user", content: STYLE },
      { role: "assistant", content: storyText },
    ],
    audio: { format: "mp3", voice: VOICE },
  });

  const audioBase64 = completion.choices[0]?.message?.audio?.data;
  if (!audioBase64) {
    throw new Error("No audio data in response");
  }

  return audioBase64;
}

async function handler(req: Request, _ctx: SupabaseContext): Promise<Response> {
  let client: OpenAI;
  try {
    client = createMimoClient();
  } catch {
    return Response.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
  }

  let storyText: string;
  try {
    const body = await req.json();
    storyText = body.story_text;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!storyText || typeof storyText !== "string" || storyText.trim().length === 0) {
    return Response.json({ error: "story_text is required and must be non-empty" }, { status: 400 });
  }

  const wordCount = storyText.trim().split(/\s+/).length;
  if (wordCount > MAX_WORDS) {
    return Response.json({ error: `story_text exceeds maximum of ${MAX_WORDS} words` }, { status: 400 });
  }

  try {
    const audioBase64 = await generateAudio(storyText, client);
    return Response.json({ audio: audioBase64 });
  } catch (err) {
    console.error("TTS failed:", err);
    return Response.json({ error: "TTS generation failed" }, { status: 502 });
  }
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
