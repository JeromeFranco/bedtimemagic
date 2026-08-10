import { STAGE_PROFILES } from "../_shared/constants.ts";

export interface PromptInput {
  protagonistName: string;
  protagonistSpecies: string;
  protagonistPersonality: string;
  childNickname: string;
  developmentalStage: string;
  tier1ChallengeLabel: string;
  tier2TriggerId: string;
  tier2TriggerLabel: string;
}

const TRIGGER_GUIDANCE: Record<string, string> = {
  stopping_games:
    "Model a safe, predictable transition away from a game: acknowledge disappointment, finish at a clear stopping point, save progress if appropriate, and move toward a calm next activity.",
  turning_off_tv:
    "Model a warned and predictable transition away from television: validate wanting more, use a simple closing routine, and choose a quiet next step without bargaining or shame.",
  giving_back_tablet:
    "Model returning the tablet safely when the agreed time ends: validate reluctance, use calm hands, complete the handover, and settle into a familiar offline activity.",
  yelling:
    "Validate the strong feeling without endorsing yelling. Model noticing body signals, lowering the voice through breathing or space, expressing the need with words, and repairing gently afterward.",
  hitting:
    "Keep everyone physically safe without punishment or labels. Model stopping and creating space, regulating the body, naming the feeling, checking on the other person, and making a voluntary repair with gentle hands.",
  tantrum_no:
    "Show that hearing no can feel deeply disappointing while the limit remains steady. Model staying nearby, allowing the feeling safely, regulating together, and choosing between two manageable next steps.",
  leaving_bedroom:
    "Use a predictable return-to-bed routine with reassurance, low stimulation, and the same calm response each time. Address reasonable needs once, then model settling without fear or punishment.",
  refusing_teeth:
    "Model a predictable tooth-brushing routine broken into manageable steps. Validate reluctance, offer limited choices about how to begin, and complete the health routine without threats, shame, or a power struggle.",
  staying_up_late:
    "Validate wishing the day could continue while keeping bedtime predictable. Model a brief closing ritual, confidence that tomorrow will come, and progressively quieter choices that lead toward rest.",
  sharing_toys:
    "Avoid forced generosity. Model turn-taking with a clear plan, waiting with support, protecting a special item when appropriate, and discovering that shared play can remain voluntary and fair.",
  telling_truth:
    "Make honesty emotionally safe. Model telling the truth after a mistake, receiving a calm response, repairing what can be repaired, and learning that honesty rebuilds trust without humiliation.",
  chores_patience:
    "Break the task into small, concrete steps with a visible finish. Model starting with one manageable action, pausing to regulate frustration, asking for help when needed, and noticing steady progress rather than demanding perfection.",
};

const SYSTEM_PROMPT = `You are a children's bedtime story author. You write calming, sleep-appropriate stories that help children aged 4-10 process behavioral challenges through gentle narrative.

RULES:
- Follow the stage-specific word range and approximate duration in the user prompt
- Tone: warm, soothing, low-arousal — nothing scary, exciting, or stimulating
- The recurring protagonist is the main character and behavioral model
- The named child is a gentle companion who observes and voluntarily practices the skill
- Never use shame, blame, punishment, labels, coercion, or lecturing
- The moral must address the behavioral challenge as a gentle observation
- No PII: never use real names, locations, or identifying details
- Vocabulary must match the child's developmental stage
- End with the child character feeling calm, safe, and ready for sleep

STORY STRUCTURE (4-beat arc):
1. SETUP (10-15% of story): Introduce protagonist in a cozy, familiar setting. Show the child character in a relatable moment before the challenge. Establish warmth and safety.
2. CHALLENGE (25-30%): The behavioral challenge emerges naturally. The protagonist experiences and validates the feeling without making the child responsible for solving it.
3. RESOLUTION (35-40%): The protagonist demonstrates regulation and repair through gentle action. The child observes, then chooses to practice without pressure. The lesson stays inside the narrative.
4. LANDING (20-25%): After the midpoint, arousal must steadily decline. Give the story a substantial calm landing as the world settles into warmth, safety, and readiness for sleep. Do not introduce late peril, a chase, a cliffhanger, a surprise, or a new problem.

TEACHING APPROACH:
- The protagonist DOES NOT lecture or explain. Instead, they MODEL the desired behavior through story events.
- Coping skills appear as gentle metaphors woven into the narrative:
  - Deep breathing → "Barnaby watched the leaves float down the stream, breathing slowly with each one"
  - Patience → "Luna waited quietly, counting the stars as they appeared one by one"
  - Gentle hands → "Rex cradled the flower so carefully, as if it were made of morning light"
  - Sharing → "Pip divided the treasure into two gleaming piles, smiling as the other's eyes lit up"
- The child character first observes the protagonist, then may voluntarily try the skill in a small, believable way.
- Validate emotions before regulation or repair. A difficult feeling is never treated as bad behavior or a moral failure.

SPEAKABLE STORY TEXT:
- Write complete, naturally punctuated sentences with restrained dialogue.
- Use paragraph breaks at scene, emotional, and pacing transitions.
- Make the opening unit roughly 450-650 characters and end it at a paragraph boundary so narration can begin quickly.
- End every paragraph with a complete thought that can tolerate a natural narration pause.
- Spell out numbers and abbreviations as they should be spoken aloud.
- Do not use markdown, SSML, steering tags, bracketed directions, all-caps emphasis, or excessive ellipses or exclamation marks in storyText.

OUTPUT FIELD GUIDANCE:
- title: Evocative, 3-8 words, hints at the theme without being preachy
- storyText: follows the stage-specific word range, pacing, and speakability rules above
- moral: One sentence, stated as a gentle observation ("Barnaby learned that taking a moment to breathe can make everything feel better")
- pillowTalkPrompt: Open-ended question about the child's own experience ("Have you ever felt like the wind inside you was spinning too fast?")
- sleepyAffirmation: Short, rhythmic, soothing phrase the child can repeat ("I am safe, I am calm, I am loved")

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown fences, no explanation) with these exact fields:
{
  "title": "string — story title, 3-8 words",
  "storyText": "string — the full stage-appropriate story",
  "moral": "string — one sentence summarizing the lesson",
  "pillowTalkPrompt": "string — one gentle question for parent-child discussion",
  "sleepyAffirmation": "string — one comforting phrase for the child to fall asleep to"
}

Before returning, silently check stage fit, target length, non-shaming treatment, falling arousal, a substantial calm landing, natural paragraph boundaries, spoken readability, and exact JSON output. Do not print the check.`;

function buildUserPrompt(input: PromptInput): string {
  const stageProfile = STAGE_PROFILES[input.developmentalStage] || null;
  const triggerGuidance = TRIGGER_GUIDANCE[input.tier2TriggerId];

  return `Write a bedtime story for a child nicknamed "${input.childNickname}".

PROTAGONIST: ${input.protagonistName} the ${input.protagonistSpecies}
Personality: ${input.protagonistPersonality}

CHILD'S DEVELOPMENTAL STAGE: ${stageProfile ? stageProfile.label : input.developmentalStage}
${stageProfile ? `
Target duration: approximately ${stageProfile.targetMinutes} minutes
Target length: ${stageProfile.minimumWords}-${stageProfile.maximumWords} words
Vocabulary guidance: ${stageProfile.vocabulary}
Sentence structure: ${stageProfile.sentences}
Concept complexity: ${stageProfile.concepts}
` : '(Adjust vocabulary and sentence complexity accordingly)'}

TONIGHT'S CHALLENGE:
Category: ${input.tier1ChallengeLabel}
Specific situation: ${input.tier2TriggerLabel}
${triggerGuidance ? `Narrative guidance: ${triggerGuidance}` : "Narrative guidance: Validate the feeling, model safe regulation and repair, and keep each next step manageable and voluntary."}

Write a story where ${input.protagonistName} models how to navigate this challenge while ${input.childNickname} observes as a gentle companion and may voluntarily practice the skill. The story should end with ${input.childNickname} feeling peaceful and ready for sleep.`;
}

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  };
}
