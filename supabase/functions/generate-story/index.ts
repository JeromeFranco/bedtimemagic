import OpenAI from "@openai/openai";
import { buildPrompt, type PromptInput } from "./prompt.ts";

const MODEL = "mimo-v2.5-pro";
const TIMEOUT_MS = 60_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  childId: string;
  protagonistId: string;
  childNickname: string;
  developmentalStage: string;
  tier1Challenge: string;
  tier2Trigger: string;
}

const PROTAGONISTS: Record<string, { name: string; species: string; personality: string; voiceNotes: string }> = {
  barnaby: {
    name: "Barnaby",
    species: "Bear",
    personality: "Gentle, patient bear who loves warm hugs and honey. Always speaks slowly and kindly, making everyone feel safe.",
    voiceNotes: "Warm baritone, slow and comforting, like a cozy blanket",
  },
  nova: {
    name: "Captain Nova",
    species: "Star Pilot",
    personality: "Brave space explorer who is curious about every star. Speaks with wonder and excitement but calms down at bedtime.",
    voiceNotes: "Energetic but softening, like a campfire winding down",
  },
  pip: {
    name: "Pip",
    species: "Penguin",
    personality: "Playful penguin who waddles everywhere and loves sliding on ice. Always giggling and making others laugh.",
    voiceNotes: "Cheerful and slightly squeaky, like a happy child",
  },
  luna: {
    name: "Luna",
    species: "Owl",
    personality: "Wise owl who sees everything from her tree. Speaks softly with ancient knowledge, making the world feel magical.",
    voiceNotes: "Whispery and mysterious, like rustling leaves at night",
  },
  rex: {
    name: "Rex",
    species: "Dragon",
    personality: "Friendly dragon who breathes warm air and guards his friends fiercely. Despite his size, he is incredibly gentle.",
    voiceNotes: "Deep and rumbly but kind, like distant thunder fading",
  },
};

const CHALLENGE_LABELS: Record<string, string> = {
  screentime: "Screen Time Limits",
  emotions: "Big Emotions / Anger",
  bedtime: "Bedtime Friction",
  social: "Social Skills",
};

const TRIGGER_LABELS: Record<string, string> = {
  stopping_games: "Stopping video games",
  turning_off_tv: "Turning off the TV",
  giving_back_tablet: "Giving back the tablet",
  yelling: "Yelling",
  hitting: "Hitting/Pushing",
  tantrum_no: "Tantrum when told 'No'",
  leaving_bedroom: "Leaving the bedroom",
  refusing_teeth: "Refusing to brush teeth",
  staying_up_late: "Wanting to stay up late",
  sharing_toys: "Sharing toys",
  telling_truth: "Telling the truth",
  chores_patience: "Chores and Patience",
};

const STAGE_LABELS: Record<string, string> = {
  preschool: "Preschool",
  early_primary: "Early Primary",
  older_kids: "Older Kids",
};

const REQUIRED_STORY_FIELDS = [
  "title",
  "storyText",
  "moral",
  "pillowTalkPrompt",
  "sleepyAffirmation",
] as const;

export class SafetyFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafetyFilterError";
  }
}

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
  const cleaned = trimmed.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export function validateStoryFields(story: Record<string, string>): void {
  const missing = REQUIRED_STORY_FIELDS.filter(
    (field) => !story[field] || typeof story[field] !== "string" || story[field].trim() === ""
  );
  if (missing.length > 0) {
    throw new Error(`Story missing required fields: ${missing.join(", ")}`);
  }
}

export async function callLLM(
  client: OpenAI,
  system: string,
  user: string,
  retry = false
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
    },
    { timeout: TIMEOUT_MS }
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  const story = parseJsonResponse(content);
  validateStoryFields(story);
  return story;
}

async function getSupabaseAdmin() {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!
  );
}

async function getUserFromJwt(supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>, authHeader: string): Promise<string> {
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

async function persistStory(
  supabase: Awaited<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  body: RequestBody,
  story: Record<string, string>
) {
  const { data, error } = await supabase
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

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("MIMO_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MIMO_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!body.childId || !body.protagonistId || !body.childNickname || !body.developmentalStage || !body.tier1Challenge || !body.tier2Trigger) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const protagonist = PROTAGONISTS[body.protagonistId];
  if (!protagonist) {
    return new Response(
      JSON.stringify({ error: "Invalid protagonist" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = await getSupabaseAdmin();

  let userId: string;
  try {
    userId = await getUserFromJwt(supabase, authHeader);
  } catch {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.xiaomimimo.com/v1",
  });

  const promptInput: PromptInput = {
    protagonistName: protagonist.name,
    protagonistSpecies: protagonist.species,
    protagonistPersonality: protagonist.personality,
    protagonistVoiceNotes: protagonist.voiceNotes,
    childNickname: body.childNickname,
    developmentalStage: STAGE_LABELS[body.developmentalStage] || body.developmentalStage,
    tier1ChallengeLabel: CHALLENGE_LABELS[body.tier1Challenge] || body.tier1Challenge,
    tier2TriggerLabel: TRIGGER_LABELS[body.tier2Trigger] || body.tier2Trigger,
  };

  const { system, user } = buildPrompt(promptInput);

  let story: Record<string, string>;
  try {
    story = await callLLM(client, system, user);
  } catch (err) {
    if (err instanceof SafetyFilterError) {
      return new Response(
        JSON.stringify({ error: "Safety filter triggered" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (err instanceof SyntaxError) {
      try {
        story = await callLLM(client, system, user, true);
      } catch (retryErr) {
        if (retryErr instanceof SafetyFilterError) {
          return new Response(
            JSON.stringify({ error: "Safety filter triggered" }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to generate valid story" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (err instanceof Error && err.message.includes("timeout")) {
      return new Response(
        JSON.stringify({ error: "Story generation timed out" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw err;
    }
  }

  let savedStory;
  try {
    savedStory = await persistStory(supabase, userId, body, story);
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to save story" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(savedStory), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
