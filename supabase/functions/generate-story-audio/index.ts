const MIMO_TTS_URL = "https://api.xiaomimimo.com/v1/audio/speech";
const MODEL = "mimo-v2.5-tts";
const VOICE = "Chloe";
const CONTEXT = "gentle bedtime story narration, warm and soothing, slow pace";
const CHUNK_SIZE = 32 * 1024;
const MAX_WORDS = 5000;
const MAX_CONCURRENT_TTS = 10;
const TTS_TIMEOUT_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function generateSentenceAudio(
  sentence: string,
  apiKey: string
): Promise<Uint8Array> {
  const response = await fetch(MIMO_TTS_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: sentence,
      response_format: "mp3",
      context: CONTEXT,
    }),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS API returned ${response.status}: ${errorText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function generateAllAudio(
  sentences: string[],
  apiKey: string
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = [];
  for (let i = 0; i < sentences.length; i += MAX_CONCURRENT_TTS) {
    const batch = sentences.slice(i, i + MAX_CONCURRENT_TTS);
    const batchResults = await Promise.all(
      batch.map((sentence, j) =>
        generateSentenceAudio(sentence, apiKey).catch((err) => {
          throw { sentenceIndex: i + j, error: err };
        })
      )
    );
    results.push(...batchResults);
  }
  return results;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sseEvent(event: string, data: string): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`);
}

Deno.serve(async (req: Request): Promise<Response> => {
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

  let storyText: string;
  try {
    const body = await req.json();
    storyText = body.story_text;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!storyText || typeof storyText !== "string" || storyText.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "story_text is required and must be non-empty" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const wordCount = storyText.trim().split(/\s+/).length;
  if (wordCount > MAX_WORDS) {
    return new Response(
      JSON.stringify({ error: `story_text exceeds maximum of ${MAX_WORDS} words` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sentences = splitSentences(storyText);
  if (sentences.length === 0) {
    return new Response(
      JSON.stringify({ error: "No sentences found in story_text" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const audioBuffers = await generateAllAudio(sentences, apiKey);

        let totalBytes = 0;
        for (const buf of audioBuffers) {
          totalBytes += buf.length;
        }

        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const buf of audioBuffers) {
          combined.set(buf, offset);
          offset += buf.length;
        }

        const totalChunks = Math.ceil(combined.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, combined.length);
          const chunk = combined.slice(start, end);
          const base64 = uint8ToBase64(chunk);

          controller.enqueue(
            sseEvent(
              "chunk",
              JSON.stringify({ index: i, total: totalChunks, audio: base64 })
            )
          );
        }

        controller.enqueue(
          sseEvent(
            "done",
            JSON.stringify({ total_chunks: totalChunks, total_bytes: totalBytes })
          )
        );
      } catch (err: unknown) {
        const sentenceIndex =
          typeof err === "object" && err !== null && "sentenceIndex" in err
            ? (err as { sentenceIndex: number }).sentenceIndex
            : -1;
        const message =
          typeof err === "object" && err !== null && "error" in err
            ? String((err as { error: Error }).error)
            : String(err);

        controller.enqueue(
          sseEvent(
            "error",
            JSON.stringify({
              message: `TTS failed for sentence ${sentenceIndex}: ${message}`,
              sentence_index: sentenceIndex,
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
