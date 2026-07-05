import { assertEquals } from "@std/assert";
import {
  BITS_PER_SAMPLE,
  CHANNELS,
  createWavHeader,
  generateSentenceAudio,
  handleRequest,
  SAMPLE_RATE,
  splitSentences,
  sseEvent,
  streamSentences,
  TTSError,
  uint8ToBase64,
} from "./index.ts";

Deno.test("splitSentences - splits on period followed by space", () => {
  const result = splitSentences("Hello world. How are you.");
  assertEquals(result, ["Hello world.", "How are you."]);
});

Deno.test("splitSentences - splits on exclamation followed by space", () => {
  const result = splitSentences("Hello! How are you!");
  assertEquals(result, ["Hello!", "How are you!"]);
});

Deno.test("splitSentences - splits on question mark followed by space", () => {
  const result = splitSentences("Hello? How are you?");
  assertEquals(result, ["Hello?", "How are you?"]);
});

Deno.test("splitSentences - splits on mixed punctuation with spaces", () => {
  const result = splitSentences("Hello! How are you? Fine.");
  assertEquals(result, ["Hello!", "How are you?", "Fine."]);
});

Deno.test("splitSentences - trims whitespace", () => {
  const result = splitSentences("  Hello world.   How are you.  ");
  assertEquals(result, ["Hello world.", "How are you."]);
});

Deno.test("splitSentences - filters empty strings", () => {
  const result = splitSentences("Hello. . World.");
  assertEquals(result, ["Hello.", ".", "World."]);
});

Deno.test("splitSentences - single sentence", () => {
  const result = splitSentences("Hello world");
  assertEquals(result, ["Hello world"]);
});

Deno.test("splitSentences - empty string", () => {
  const result = splitSentences("");
  assertEquals(result, []);
});

Deno.test("createWavHeader - returns 44 bytes", () => {
  const header = createWavHeader(1000);
  assertEquals(header.length, 44);
});

Deno.test("createWavHeader - starts with RIFF", () => {
  const header = createWavHeader(1000);
  const text = String.fromCharCode(...header.slice(0, 4));
  assertEquals(text, "RIFF");
});

Deno.test("createWavHeader - has WAVE format", () => {
  const header = createWavHeader(1000);
  const text = String.fromCharCode(...header.slice(8, 12));
  assertEquals(text, "WAVE");
});

Deno.test("createWavHeader - has fmt chunk", () => {
  const header = createWavHeader(1000);
  const text = String.fromCharCode(...header.slice(12, 16));
  assertEquals(text, "fmt ");
});

Deno.test("createWavHeader - has data chunk", () => {
  const header = createWavHeader(1000);
  const text = String.fromCharCode(...header.slice(36, 40));
  assertEquals(text, "data");
});

Deno.test("createWavHeader - encodes correct file size", () => {
  const dataLength = 1000;
  const header = createWavHeader(dataLength);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(4, true), 36 + dataLength);
});

Deno.test("createWavHeader - encodes correct data length", () => {
  const dataLength = 1000;
  const header = createWavHeader(dataLength);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(40, true), dataLength);
});

Deno.test("createWavHeader - encodes sample rate", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(24, true), SAMPLE_RATE);
});

Deno.test("createWavHeader - encodes channels", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint16(22, true), CHANNELS);
});

Deno.test("createWavHeader - encodes bits per sample", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint16(34, true), BITS_PER_SAMPLE);
});

Deno.test("createWavHeader - encodes byte rate", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(28, true), (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8);
});

Deno.test("createWavHeader - encodes block align", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint16(32, true), (CHANNELS * BITS_PER_SAMPLE) / 8);
});

Deno.test("createWavHeader - encodes PCM format", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint16(20, true), 1);
});

Deno.test("createWavHeader - encodes subchunk1 size", () => {
  const header = createWavHeader(1000);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(16, true), 16);
});

Deno.test("createWavHeader - handles zero data length", () => {
  const header = createWavHeader(0);
  const view = new DataView(header.buffer);
  assertEquals(view.getUint32(4, true), 36);
  assertEquals(view.getUint32(40, true), 0);
});

Deno.test("uint8ToBase64 - converts empty array", () => {
  const result = uint8ToBase64(new Uint8Array([]));
  assertEquals(result, "");
});

Deno.test("uint8ToBase64 - converts single byte", () => {
  const result = uint8ToBase64(new Uint8Array([72])); // 'H'
  assertEquals(result, "SA==");
});

Deno.test("uint8ToBase64 - converts multiple bytes", () => {
  const result = uint8ToBase64(new Uint8Array([72, 101, 108, 108, 111])); // 'Hello'
  assertEquals(result, "SGVsbG8=");
});

Deno.test("uint8ToBase64 - converts binary data", () => {
  const input = new Uint8Array([0, 1, 2, 255, 254, 253]);
  const result = uint8ToBase64(input);
  // Verify round-trip
  const binary = atob(result);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    output[i] = binary.charCodeAt(i);
  }
  assertEquals(Array.from(output), Array.from(input));
});

Deno.test("sseEvent - formats event correctly", () => {
  const result = sseEvent("test", "data");
  const text = new TextDecoder().decode(result);
  assertEquals(text, "event: test\ndata: data\n\n");
});

Deno.test("sseEvent - handles JSON data", () => {
  const data = JSON.stringify({ key: "value" });
  const result = sseEvent("chunk", data);
  const text = new TextDecoder().decode(result);
  assertEquals(text, `event: chunk\ndata: ${data}\n\n`);
});

Deno.test("TTSError - stores sentence index", () => {
  const cause = new Error("network error");
  const err = new TTSError(5, cause);
  assertEquals(err.sentenceIndex, 5);
  assertEquals(err.message, "TTS failed for sentence 5");
  assertEquals(err.cause, cause);
  assertEquals(err.name, "TTSError");
});

Deno.test("generateSentenceAudio - decodes base64 audio", async () => {
  const pcmData = new Uint8Array([1, 2, 3, 4]);
  let binary = "";
  for (const byte of pcmData) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { audio: { data: base64 } } }],
          }),
      },
    },
  };

  const result = await generateSentenceAudio("Hello", mockClient as any);
  assertEquals(Array.from(result), [1, 2, 3, 4]);
});

Deno.test("generateSentenceAudio - throws on missing audio", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { audio: null } }],
          }),
      },
    },
  };

  try {
    await generateSentenceAudio("Hello", mockClient as any);
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "No audio data in response");
  }
});

Deno.test("streamSentences - emits sentence events per sentence", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: (params: any) => {
          const sentence = params.messages[1].content;
          const bytes = new Uint8Array([sentence.charCodeAt(0)]);
          let binary = "";
          for (const byte of bytes) {
            binary += String.fromCharCode(byte);
          }
          return Promise.resolve({
            choices: [{ message: { audio: { data: btoa(binary) } } }],
          });
        },
      },
    },
  };

  const events: { event: string; data: any }[] = [];
  for await (const event of streamSentences(["A", "B", "C"], mockClient as any)) {
    events.push(event);
  }

  assertEquals(events.length, 4); // 3 sentences + done
  assertEquals(events[0].event, "sentence");
  assertEquals(events[0].data.index, 0);
  assertEquals(events[0].data.total, 3);
  assertEquals(typeof events[0].data.audio, "string");
  assertEquals(events[3].event, "done");
  assertEquals(events[3].data.total_sentences, 3);
});

Deno.test("streamSentences - yields sentence-error on TTS failure and continues", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: (params: any) => {
          const sentence = params.messages[1].content;
          if (sentence === "B") {
            return Promise.reject(new Error("TTS API timeout"));
          }
          const bytes = new Uint8Array([sentence.charCodeAt(0)]);
          let binary = "";
          for (const byte of bytes) {
            binary += String.fromCharCode(byte);
          }
          return Promise.resolve({
            choices: [{ message: { audio: { data: btoa(binary) } } }],
          });
        },
      },
    },
  };

  const events: { event: string; data: any }[] = [];
  for await (const event of streamSentences(["A", "B", "C"], mockClient as any)) {
    events.push(event);
  }

  const errorEvent = events.find((e) => e.event === "sentence-error");
  assertEquals(errorEvent != null, true);
  assertEquals(errorEvent!.data.index, 1);
  assertEquals(typeof errorEvent!.data.message, "string");
  assertEquals(errorEvent!.data.message.includes("TTS API timeout"), true);

  const sentenceEvents = events.filter((e) => e.event === "sentence");
  assertEquals(sentenceEvents.length, 2);
  assertEquals(sentenceEvents[0].data.index, 0);
  assertEquals(sentenceEvents[1].data.index, 2);

  const doneEvent = events.find((e) => e.event === "done");
  assertEquals(doneEvent != null, true);
  assertEquals(doneEvent!.data.total_sentences, 3);
});

Deno.test("streamSentences - respects maxSentences", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: (params: any) => {
          const bytes = new Uint8Array([1]);
          let binary = "";
          for (const byte of bytes) {
            binary += String.fromCharCode(byte);
          }
          return Promise.resolve({
            choices: [{ message: { audio: { data: btoa(binary) } } }],
          });
        },
      },
    },
  };

  const events: { event: string; data: any }[] = [];
  for await (const event of streamSentences(["A", "B", "C"], mockClient as any, 2)) {
    events.push(event);
  }

  assertEquals(events.length, 3); // 2 sentences + done
  assertEquals(events[0].data.index, 0);
  assertEquals(events[1].data.index, 1);
  assertEquals(events[2].event, "done");
  assertEquals(events[2].data.total_sentences, 2);
});

// --- handleRequest integration tests ---

Deno.test("handleRequest - returns 200 for OPTIONS preflight", async () => {
  const req = new Request("http://localhost", { method: "OPTIONS" });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "ok");
});

Deno.test("handleRequest - returns 401 when no Authorization header", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ story_text: "Hello world. How are you." }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 401 for missing story_text (auth check first)", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({}),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
});

Deno.test("handleRequest - returns 401 for empty story_text (auth check first)", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ story_text: "   " }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
});

Deno.test("handleRequest - returns 401 for invalid JSON body (auth check first)", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: "not-json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
});

Deno.test("handleRequest - returns 401 for invalid max_sentences (auth check first)", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ story_text: "Hello.", max_sentences: -1 }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
});
