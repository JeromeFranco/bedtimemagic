import { createGoogleGenerativeAI } from "https://esm.sh/@ai-sdk/google@3";
import { generateText } from "https://esm.sh/ai@6";

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

  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_AI_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get Supabase admin client
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Authenticate user
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify story exists and belongs to user
  const { data: story, error: storyError } = await supabase
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

  // Generate image with Gemini
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google("gemini-3.1-flash-image-generation");

  let imageBytes: Uint8Array;
  try {
    const result = await generateText({
      model,
      prompt,
      timeout: 60_000,
      providerOptions: {
        google: { responseModalities: ["image"] },
      },
    });

    // Extract image from response
    const imagePart = result.files?.find((f) => f.mediaType.startsWith("image/"));
    if (!imagePart) {
      throw new Error("No image in response");
    }
    imageBytes = imagePart.uint8Array;
  } catch (err) {
    console.error("Image generation failed:", err);
    return new Response(
      JSON.stringify({ error: "Image generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Upload to Supabase Storage
  const filePath = `covers/${body.storyId}.png`;
  const { error: uploadError } = await supabase.storage
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
  const { data: urlData } = supabase.storage
    .from("covers")
    .getPublicUrl(filePath);

  const coverImageUrl = urlData.publicUrl;

  // Update story record
  const { error: updateError } = await supabase
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
