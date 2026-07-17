import OpenAI from "@openai/openai";
import { withSupabase, type SupabaseContext } from "@supabase/server";
import { CHALLENGE_LABELS, PROTAGONISTS, TRIGGER_LABELS } from "../_shared/constants.ts";
import { SafetyFilterError } from "../_shared/errors.ts";
import { createMimoClient } from "../_shared/openai.ts";
import { buildPrompt, type PromptInput } from "./prompt.ts";

const MODEL = "mimo-v2.5-pro-ultraspeed";
const TIMEOUT_MS = 60_000;

interface RequestBody {
  childId: string;
  protagonistId: string;
  childNickname: string;
  developmentalStage: string;
  tier1Challenge: string;
  tier2Trigger: string;
}

const REQUIRED_STORY_FIELDS = ["title", "storyText", "moral", "pillowTalkPrompt", "sleepyAffirmation"] as const;

export { SafetyFilterError } from "../_shared/errors.ts";

const SAFETY_REFUSAL_PATTERNS = [
  /^i can'?t\b/i,
  /^i'?m unable\b/i,
  /^i apologize/i,
  /^i'?m sorry,? but i/i,
  /^as an ai/i,
  /^i don'?t (?:think|feel) (?:it'?s )?appropriate/i,
  /^unfortunately,? i/i,
];

export function parseJsonResponse(text: string): Record<string, string> {
  const trimmed = text.trim();
  for (const pattern of SAFETY_REFUSAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new SafetyFilterError("Safety filter triggered");
    }
  }
  const cleaned = trimmed
    .replace(/```json?\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

export function validateStoryFields(story: Record<string, string>): void {
  const missing = REQUIRED_STORY_FIELDS.filter(
    (field) => !story[field] || typeof story[field] !== "string" || story[field].trim() === "",
  );
  if (missing.length > 0) {
    throw new Error(`Story missing required fields: ${missing.join(", ")}`);
  }
}

export async function callLLM(
  client: OpenAI,
  system: string,
  user: string,
  { retry = false, signal }: { retry?: boolean; signal?: AbortSignal } = {},
): Promise<Record<string, string>> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: retry
        ? `${user}\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, no extra text.`
        : user,
    },
  ];

  const completion = await client.chat.completions.create(
    {
      model: MODEL,
      messages,
      reasoning_effort: "medium",
    },
    { timeout: TIMEOUT_MS, maxRetries: 0, signal },
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  const story = parseJsonResponse(content);
  validateStoryFields(story);
  return story;
}

async function persistStory(
  supabase: SupabaseContext["supabaseAdmin"],
  userId: string,
  body: RequestBody,
  story: Record<string, string>,
) {
  const { data, error } = await (supabase as any)
    .from("stories")
    .insert({
      user_id: userId,
      child_id: body.childId,
      title: story.title,
      story_text: story.storyText,
      moral: story.moral,
      pillow_talk_prompt: story.pillowTalkPrompt,
      sleepy_affirmation: story.sleepyAffirmation,
      cover_image_url: null,
      challenge: body.tier2Trigger,
      protagonist: body.protagonistId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function handler(req: Request, ctx: SupabaseContext): Promise<Response> {
  let client: OpenAI;
  try {
    client = createMimoClient();
  } catch (err) {
    console.error("Failed to create MiMo client:", err);
    return Response.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !body.childId ||
    !body.protagonistId ||
    !body.childNickname ||
    !body.developmentalStage ||
    !body.tier1Challenge ||
    !body.tier2Trigger
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const protagonist = PROTAGONISTS[body.protagonistId];
  if (!protagonist) {
    return Response.json({ error: "Invalid protagonist" }, { status: 400 });
  }

  const userId = ctx.userClaims!.id;

  const promptInput: PromptInput = {
    protagonistName: protagonist.name,
    protagonistSpecies: protagonist.species,
    protagonistPersonality: protagonist.personality,
    childNickname: body.childNickname,
    developmentalStage: body.developmentalStage, // Pass key directly, not label
    tier1ChallengeLabel: CHALLENGE_LABELS[body.tier1Challenge] || body.tier1Challenge,
    tier2TriggerLabel: TRIGGER_LABELS[body.tier2Trigger] || body.tier2Trigger,
  };

  const { system, user } = buildPrompt(promptInput);

  let story: Record<string, string>;
  try {
    story = await callLLM(client, system, user, { signal: req.signal });
  } catch (err) {
    if (err instanceof SafetyFilterError) {
      return Response.json({ error: "Safety filter triggered" }, { status: 422 });
    }

    if (err instanceof SyntaxError) {
      try {
        story = await callLLM(client, system, user, { retry: true, signal: req.signal });
      } catch (retryErr) {
        if (retryErr instanceof SafetyFilterError) {
          return Response.json({ error: "Safety filter triggered" }, { status: 422 });
        }
        console.error("LLM retry failed:", retryErr);
        return Response.json({ error: "Failed to generate valid story" }, { status: 500 });
      }
    } else if (err instanceof OpenAI.APIError) {
      const status = err.status || 502;
      console.error(`LLM API error (${status}):`, err.message);
      return Response.json({ error: err.message }, { status });
    } else {
      console.error("LLM call failed:", err);
      return Response.json({ error: "Story generation failed" }, { status: 500 });
    }
  }

  let savedStory;
  try {
    savedStory = await persistStory(ctx.supabaseAdmin, userId, body, story);
  } catch (err) {
    console.error("Failed to persist story:", err);
    return Response.json({ error: "Failed to save story" }, { status: 500 });
  }

  return Response.json(savedStory);
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
