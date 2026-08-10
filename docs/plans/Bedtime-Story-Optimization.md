 # Bedtime Story, Inworld TTS, and Seamless Segmentation Optimization

  ## Summary

  - Keep prompt, TTS, segmentation, and playback continuity in one plan because they form a single audio-quality pipeline.
  - The current splitter is safe for Inworld’s 2,000-character limit and usually ends at sentences, but two quality risks remain:
      - Each segment is an independent TTS generation, so cadence and emotional delivery can reset.
      - PlayerContext waits for didJustFinish, destroys the player, creates another player, and calls play(), creating a JS/native handoff
        where an audible gap can occur.

  - Use natural narrative boundaries plus Expo SDK 56’s AudioPlaylist, which provides framework-supported gapless playback, instead of
    manually replacing players (Expo AudioPlaylist (https://docs.expo.dev/versions/latest/sdk/audio/)).

  - Retain segmented Inworld streaming and caching. Inworld itself recommends natural-boundary chunking and stitched playback for long text
    (Inworld long-text guidance (https://dev.docs.inworld.ai/docs/tts/capabilities/long-text-input)).

  - Treat WebSocket/PCM streaming as a separate future plan only if native playlist playback and improved boundaries still produce
    unacceptable prosody resets or encoder-padding artifacts.

  ## Story and Prompt Changes

  - Adopt stage-adaptive targets:
      - Preschool: approximately six minutes, initially 700–850 words.
      - Early primary: approximately eight minutes, initially 900–1,050 words.
      - Older kids: approximately ten minutes, initially 1,100–1,250 words.

  - Make the recurring protagonist the behavioral model and the named child a gentle companion who observes and voluntarily practices the
    skill without shame, blame, punishment, or lecturing.

  - Add trigger-specific narrative guidance for all twelve challenge options, covering safe transitions, emotional validation, regulation,
    repair, predictable bedtime routines, honesty, turn-taking, and manageable task steps.

  - Give the story a declining arousal curve after its midpoint, a substantial calm landing, and no late peril, chase, cliffhanger, or
    surprise.

  - Make storyText directly speakable:
      - Use complete, naturally punctuated sentences and restrained dialogue.
      - Use paragraph breaks at scene, emotional, and pacing transitions.
      - Spell numbers and abbreviations as spoken words.
      - Avoid markdown, SSML, steering tags, all-caps emphasis, and excessive ellipses or exclamation marks.
      - Finish each paragraph with a complete thought that can tolerate a natural narration pause.

  - Ask the model to produce an opening unit of roughly 450–650 characters ending at a paragraph boundary, allowing fast initial playback
    without an arbitrary mid-paragraph split.

  - Add a silent final check for stage fit, target length, non-shaming treatment, falling arousal, natural paragraph boundaries, spoken
    readability, and exact JSON output.

  - Update the PRD to describe stage-adaptive duration and the actual MiMo-to-Inworld pipeline.

  ## Segmentation and Playback Changes

  - Replace the current boundary selection with this priority:
      1. Paragraph boundary within the permitted size window.
      2. Complete sentence boundary.
      3. Line break.
      4. Clause punctuation.
      5. Word boundary.
      6. Hard character split only for pathological input.

  - Retain a 600-character first-segment cap for startup latency, provided a natural boundary exists. If none exists after a 400-character
    minimum, allow the first segment to grow to the normal cap rather than forcing an awkward early split.

  - Use 500 characters as the preferred minimum for subsequent segments and 1,900 as the hard target cap, preserving a 100-character margin
    below Inworld’s limit.

  - Never split:
      - Inside quotation marks when a later valid boundary is available.
      - Between a dialogue line and its attribution.
      - Immediately before a one-sentence paragraph that can fit in the preceding segment.
      - In the middle of an SSML-like or bracketed token, even though prompts prohibit them.

  - Keep inworld-tts-1.5-mini, Ashley, MP3, and sequential generation. Set speakingRate: 0.9 and temperature: 1.0; do not add unsupported TTS-
    2 steering.

  - Replace the story’s sequence of independently created AudioPlayer instances with one createAudioPlaylist instance:
      - Start with the completed first segment.
      - Append completed segments in index order as prefetch finishes.
      - Let the native playlist perform prepared track transitions without a JS didJustFinish → destroy → create → play cycle.
      - Preserve explicit buffering if playback reaches the end of the currently appended tracks before the next segment is ready.
      - Resume automatically only when playback was interrupted by generation underrun, never after the parent manually paused.
      - Preserve cancellation, stale-story rejection, background playback, seeking, cumulative duration, and post-story behavior.

  - Continue caching individual MP3 segments. Do not concatenate files on-device, switch to storage-heavy WAV, add crossfades, or introduce
    FFmpeg.

  - Explicitly test whether independently encoded MP3 padding remains audible through the native playlist. If it does, stop after documenting
    evidence; WebSocket/continuous-audio transport would then require a separate architecture plan.

  ## Interfaces and Tests

  - Extend STAGE_PROFILES with targetMinutes, minimumWords, and maximumWords.
  - Add internal trigger guidance keyed by trigger ID and pass the trigger ID through PromptInput. No client request, database, or public API
    change.

  - Add segmentation tests for:
      - Paragraph-first splitting and reconstruction without lost text.
      - First-segment latency cap with graceful expansion when no safe boundary exists.
      - Dialogue/attribution preservation.
      - Sentence, clause, word, and pathological hard-split fallbacks.
      - Every segment remaining below 2,000 characters and containing no unintended empty segment.

  - Replace PlayerContext tests with playlist-aware coverage:
      - One playlist per story rather than one player per segment.
      - Ordered dynamic insertion of generated and cached segments.
      - Automatic native track progression.
      - Underrun buffering and automatic recovery.
      - Manual pause remaining paused when a new segment arrives.
      - Seeking across known segment durations.
      - Story switch, stop, unmount, retry, and stale-completion behavior.
      - Final track transitioning exactly once into the post-story flow.

  - Update Inworld tests to assert model, voice, encoding, speaking rate, temperature, ordering, and unchanged retry/cancellation behavior.
  - The existing focused prompt test failure—5–8 expected words versus the current 6–10 constant—will be replaced with the new stage contract
    rather than patched independently.

  ## Live Quality and Duration Evaluation

  - After separate approval for paid calls, generate twelve stories: every trigger once, four per stage, with all five protagonists
    represented.

  - Measure:
      - Actual audio runtime against six/eight/ten-minute targets.
      - Voice warmth, emotional expression, calm pacing, pronunciation, and within-segment prosody.
      - Prosody consistency across segment boundaries.
      - Audible silence, clicks, clipped phonemes, repeated words, or abrupt tone changes at each boundary.
      - Both platforms complete a full uncached story and a fully cached replay without an unintended buffering pause when the next segment is
        ready.

  - If a duration median misses its target, scale that stage’s word bounds by target duration ÷ observed median duration, round to the nearest
    twenty-five words, and rerun that stage once.

  - If prosody varies but playback is gapless, compare temperature 0.8 against 1.0 on the same three boundary excerpts and retain 0.8 only if
    it improves continuity without reducing emotional-expression scores.

  - If native playlist playback still has repeatable audible seams, record the affected platform, encoding, gap behavior, and sample
  - npm run typecheck
  - npm run test:ci -- --runInBand
  - npm run test:functions

  Execution approval must cover only:

  - docs/prd.md
  - supabase/functions/_shared/constants.ts
  - supabase/functions/generate-story/prompt.ts
  - supabase/functions/generate-story/index.ts
  - supabase/functions/tests/generate-story/prompt.test.ts
  - supabase/functions/tests/generate-story/index.test.ts
  - src/lib/story-segments.ts

  Confidence: high that the current manual player replacement can create avoidable transition gaps and that AudioPlaylist is the idiomatic
  first fix; medium that it will completely remove perceived discontinuity because independent TTS generations and MP3 encoder padding must be
  verified on real devices.