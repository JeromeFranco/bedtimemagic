import { generateImage, gateway } from "ai";
import { withSupabase, type SupabaseContext } from "@supabase/server";

interface RequestBody {
  storyId: string;
  title: string;
  challenge?: string;
  protagonist?: string;
}

export function mapChallengeToScene(challenge: string): string {
  const scenes: Record<string, string> = {
    stopping_games: "a child happily putting away a video game controller in a cozy room",
    turning_off_tv: "a child turning off a TV screen in a warm living room",
    giving_back_tablet: "a child gently handing back a tablet device",
    yelling: "a child taking a deep breath with calming colors around",
    hitting: "a child holding hands gently with a friend",
    tantrum_no: "a child sitting calmly after hearing the word no",
    leaving_bedroom: "a child snuggled in bed with a nightlight glowing softly",
    refusing_teeth: "a child smiling and brushing teeth at a bathroom sink",
    staying_up_late: "a peaceful bedroom with stars and moon visible through a window",
    sharing_toys: "friendly characters sharing and playing together gently",
    telling_truth: "a child speaking honestly with a warm golden glow around",
    chores_patience: "a child helping with chores in a tidy kitchen",
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

async function handler(req: Request, ctx: SupabaseContext): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.storyId || !body.title) {
    return Response.json({ error: "storyId and title are required" }, { status: 400 });
  }

  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "AI_GATEWAY_API_KEY not configured" }, { status: 500 });
  }

  const userId = ctx.userClaims!.sub;
  const supabase = ctx.supabaseAdmin;

  // Verify story exists and belongs to user
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, protagonist, challenge")
    .eq("id", body.storyId)
    .eq("user_id", userId)
    .single();

  if (storyError || !story) {
    return Response.json({ error: "Story not found" }, { status: 404 });
  }

  const prompt = buildCoverPrompt(
    body.title,
    body.protagonist ?? story.protagonist ?? "bear",
    body.challenge ?? story.challenge ?? "bedtime"
  );

  let imageBytes: Uint8Array;
  try {
    const result = await generateImage({
      model: gateway.image("bfl/flux-2-klein-4b"),
      prompt,
    });
    imageBytes = result.image.uint8Array;
  } catch (err) {
    console.error("Image generation failed:", err);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }

  const filePath = `${body.storyId}.png`;
  const { error: uploadError } = await supabase.storage
    .from("covers")
    .upload(filePath, imageBytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return Response.json({ error: "Failed to upload image" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("covers").getPublicUrl(filePath);
  const coverImageUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("stories")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", body.storyId);

  if (updateError) {
    console.error("Story update failed:", updateError);
    return Response.json({ error: "Failed to update story" }, { status: 500 });
  }

  return Response.json({ coverImageUrl });
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
