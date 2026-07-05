import { generateImage, gateway } from "ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | undefined;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  storyId: string;
  title: string;
  challenge?: string;
  protagonist?: string;
}

export function mapChallengeToScene(challenge: string): string {
  const scenes: Record<string, string> = {
    screentime: "a child putting away a device in a cozy room",
    emotions: "a child breathing calmly with warm soothing colors around",
    bedtime: "a peaceful bedroom with stars and moon visible through a window",
    social: "friendly characters sharing and playing together gently",
  };
  return scenes[challenge] ?? "a cozy bedtime scene";
}

export function buildCoverPrompt(
  title: string,
  protagonistSpecies: string,
  challenge: string
): string {
  const scene = mapChallengeToScene(challenge);
  return [
    "A soft, muted watercolor illustration for a children's bedtime storybook.",
    `Scene: ${scene} featuring a friendly ${protagonistSpecies.toLowerCase()} character.`,
    `Story title hint: "${title}".`,
    "Style: gentle pastel colors, dreamy atmosphere, rounded soft shapes, no text, no words, no letters, no numbers.",
    "Calming and sleep-appropriate. Aspect ratio: 4:3 landscape.",
    "Children's book illustration, safe, calming, warm.",
  ].join(" ");
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

  if (!body.storyId || !body.title) {
    return new Response(
      JSON.stringify({ error: "storyId and title are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "AI_GATEWAY_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Authenticate user
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify story exists and belongs to user
  const { data: story, error: storyError } = await getSupabase()
    .from("stories")
    .select("id, protagonist, challenge")
    .eq("id", body.storyId)
    .eq("user_id", user.id)
    .single();

  if (storyError || !story) {
    return new Response(
      JSON.stringify({ error: "Story not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build prompt
  const prompt = buildCoverPrompt(
    body.title,
    body.protagonist ?? story.protagonist ?? "bear",
    body.challenge ?? story.challenge ?? "bedtime"
  );

  // Generate image with BFL Flux via Vercel AI Gateway
  let imageBytes: Uint8Array;
  try {
    const result = await generateImage({
      model: gateway.image("bfl/flux-2-klein-4b"),
      prompt,
    });

    imageBytes = result.image.uint8Array;
  } catch (err) {
    console.error("Image generation failed:", err);
    return new Response(
      JSON.stringify({ error: "Image generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Upload to Supabase Storage
  const filePath = `covers/${body.storyId}.png`;
  const { error: uploadError } = await getSupabase().storage
    .from("covers")
    .upload(filePath, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return new Response(
      JSON.stringify({ error: "Failed to upload image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get public URL
  const { data: urlData } = getSupabase().storage
    .from("covers")
    .getPublicUrl(filePath);

  const coverImageUrl = urlData.publicUrl;

  // Update story record
  const { error: updateError } = await getSupabase()
    .from("stories")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", body.storyId);

  if (updateError) {
    console.error("Story update failed:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update story" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ coverImageUrl }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

if (import.meta.main) {
  Deno.serve(handleRequest);
}
