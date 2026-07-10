import OpenAI from "@openai/openai";
import { withSupabase, type SupabaseContext } from "@supabase/server";
import { createMimoClient } from "../_shared/openai.ts";
import { TTSError } from "../_shared/errors.ts";

export { TTSError } from "../_shared/errors.ts";

const MODEL = "mimo-v2.5-tts";
const VOICE = "Chloe";
const STYLE = "gentle bedtime story narration, warm and soothing, slow pace";
const MAX_WORDS = 5000;
const MAX_CONCURRENT_TTS = 10;
const TTS_TIMEOUT_MS = 30_000;
export const SAMPLE_RATE = 24000;
export const BITS_PER_SAMPLE = 16;
export const CHANNELS = 1;

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function createWavHeader(dataLength: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  v.setUint8(0, 0x52); // R
  v.setUint8(1, 0x49); // I
  v.setUint8(2, 0x46); // F
  v.setUint8(3, 0x46); // F
  v.setUint32(4, 36 + dataLength, true);
  v.setUint8(8, 0x57);  // W
  v.setUint8(9, 0x41);  // A
  v.setUint8(10, 0x56); // V
  v.setUint8(11, 0x45); // E
  v.setUint8(12, 0x66); // f
  v.setUint8(13, 0x6D); // m
  v.setUint8(14, 0x74); // t
  v.setUint8(15, 0x20); // space
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, CHANNELS, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8, true);
  v.setUint16(32, CHANNELS * BITS_PER_SAMPLE / 8, true);
  v.setUint16(34, BITS_PER_SAMPLE, true);
  v.setUint8(36, 0x64); // d
  v.setUint8(37, 0x61); // a
  v.setUint8(38, 0x74); // t
  v.setUint8(39, 0x61); // a
  v.setUint32(40, dataLength, true);
  return new Uint8Array(header);
}

export async function generateSentenceAudio(
  sentence: string,
  client: OpenAI
): Promise<Uint8Array> {
  const completion = await client.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: "user", content: STYLE },
        { role: "assistant", content: sentence },
      ],
      audio: { format: "pcm16", voice: VOICE },
    },
    { timeout: TTS_TIMEOUT_MS }
  );

  const audioBase64 = completion.choices[0].message.audio?.data;
  if (!audioBase64) {
    throw new Error("No audio data in response");
  }

  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}

export async function* streamSentences(
  sentences: string[],
  client: OpenAI,
  maxSentences?: number
): AsyncGenerator<{ event: string; data: Record<string, unknown> }> {
  const toProcess = maxSentences ? sentences.slice(0, maxSentences) : sentences;
  const total = toProcess.length;
  let totalBytes = 0;

  for (let i = 0; i < toProcess.length; i += MAX_CONCURRENT_TTS) {
    const batch = toProcess.slice(i, i + MAX_CONCURRENT_TTS);
    const batchOffset = i;

    const promises = batch.map((sentence, j) =>
      withRetry(() => generateSentenceAudio(sentence, client))
        .then((pcm) => ({ index: batchOffset + j, pcm, error: null as null }))
        .catch((err) => {
          console.warn(`TTS failed for sentence ${batchOffset + j}:`, err);
          return {
            index: batchOffset + j,
            pcm: null as Uint8Array | null,
            error: err,
          };
        })
    );

    const pending = new Set(promises.map((_, j) => j));

    while (pending.size > 0) {
      const result = await Promise.race(
        [...pending].map((j) =>
          promises[j].then((r) => ({ ...r, promiseIndex: j }))
        )
      );

      pending.delete(result.promiseIndex);

      if (result.pcm) {
        const pcm = result.pcm;
        const header = createWavHeader(pcm.length);
        const wav = new Uint8Array(header.length + pcm.length);
        wav.set(header, 0);
        wav.set(pcm, header.length);
        totalBytes += wav.length;

        yield {
          event: "sentence",
          data: { index: result.index, total, audio: uint8ToBase64(wav) },
        };
      } else {
        yield {
          event: "sentence-error",
          data: { index: result.index, message: String(result.error) },
        };
      }
    }
  }

  yield {
    event: "done",
    data: { total_sentences: total, total_bytes: totalBytes },
  };
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function sseEvent(event: string, data: string): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`);
}

async function handler(req: Request, _ctx: SupabaseContext): Promise<Response> {
  let client: OpenAI;
  try {
    client = createMimoClient();
  } catch (err) {
    console.error("Failed to create MiMo client:", err);
    return Response.json({ error: "MIMO_API_KEY not configured" }, { status: 500 });
  }

  let storyText: string;
  let maxSentences: number | undefined;
  try {
    const body = await req.json();
    storyText = body.story_text;
    maxSentences = body.max_sentences;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!storyText || typeof storyText !== "string" || storyText.trim().length === 0) {
    return Response.json({ error: "story_text is required and must be non-empty" }, { status: 400 });
  }

  if (maxSentences !== undefined && (!Number.isInteger(maxSentences) || maxSentences < 1)) {
    return Response.json({ error: "max_sentences must be a positive integer" }, { status: 400 });
  }

  const wordCount = storyText.trim().split(/\s+/).length;
  if (wordCount > MAX_WORDS) {
    return Response.json({ error: `story_text exceeds maximum of ${MAX_WORDS} words` }, { status: 400 });
  }

  const sentences = splitSentences(storyText);
  if (sentences.length === 0) {
    return Response.json({ error: "No sentences found in story_text" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamSentences(sentences, client, maxSentences)) {
          controller.enqueue(sseEvent(event.event, JSON.stringify(event.data)));
        }
      } catch (err: unknown) {
        console.error("TTS stream failed:", err);
        const message = err instanceof TTSError ? String(err.cause) : String(err);
        controller.enqueue(sseEvent("error", JSON.stringify({ message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
