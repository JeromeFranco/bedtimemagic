import { withSupabase, type SupabaseContext } from "@supabase/server";
import { createAiGatewayClient } from "../_shared/ai.ts";
import { CHALLENGE_SCENES } from "../_shared/constants.ts";

interface RequestBody {
  storyId: string;
  title: string;
  challenge?: string;
  protagonist?: string;
}

export function mapChallengeToScene(challenge: string): string {
  return CHALLENGE_SCENES[challenge] ?? "a cozy bedtime scene";
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
  let configuredClient: ReturnType<typeof createAiGatewayClient>;
  try {
    configuredClient = createAiGatewayClient();
  } catch (err) {
    console.error("Failed to create AI Gateway client:", err);
    return Response.json({ error: "AI_GATEWAY_API_KEY not configured" }, { status: 500 });
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

  const userId = ctx.userClaims!.id;
  const supabase = ctx.supabaseAdmin as any;

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
    const result = await configuredClient.client.images.generate({
      model: configuredClient.model,
      prompt,
      size: "512x512",
      response_format: "b64_json",
    });
    const base64Image = result.data?.[0]?.b64_json;
    if (!base64Image) {
      throw new Error("Image generation returned no image data");
    }

    const binaryImage = atob(base64Image);
    imageBytes = Uint8Array.from(binaryImage, (character) => character.charCodeAt(0));
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
