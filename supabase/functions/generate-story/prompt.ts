export interface PromptInput {
  protagonistName: string;
  protagonistSpecies: string;
  protagonistPersonality: string;
  protagonistVoiceNotes: string;
  childNickname: string;
  developmentalStage: string;
  tier1ChallengeLabel: string;
  tier2TriggerLabel: string;
}

const SYSTEM_PROMPT = `You are a children's bedtime story author. You write calming, sleep-appropriate stories that help children aged 4-10 process behavioral challenges through gentle narrative.

RULES:
- Stories must be 1200-1500 words (approximately 10 minutes when read aloud)
- Tone: warm, soothing, low-arousal — nothing scary, exciting, or stimulating
- The protagonist must be integrated naturally as the main character
- The moral must directly address the behavioral challenge
- No PII: never use real names, locations, or identifying details
- Vocabulary must match the child's developmental stage
- End with the child character feeling calm, safe, and ready for sleep

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown fences, no explanation) with these exact fields:
{
  "title": "string — story title, 3-8 words",
  "storyText": "string — the full story, 1200-1500 words",
  "moral": "string — one sentence summarizing the lesson",
  "pillowTalkPrompt": "string — one gentle question for parent-child discussion",
  "sleepyAffirmation": "string — one comforting phrase for the child to fall asleep to"
}`;

function buildUserPrompt(input: PromptInput): string {
  return `Write a bedtime story for a child nicknamed "${input.childNickname}".

PROTAGONIST: ${input.protagonistName} the ${input.protagonistSpecies}
Personality: ${input.protagonistPersonality}

TONALITY: ${input.protagonistVoiceNotes}

CHILD'S DEVELOPMENTAL STAGE: ${input.developmentalStage}
(Adjust vocabulary and sentence complexity accordingly)

TONIGHT'S CHALLENGE:
Category: ${input.tier1ChallengeLabel}
Specific situation: ${input.tier2TriggerLabel}

Write a story where ${input.protagonistName} helps ${input.childNickname} understand and cope with this challenge. The story should end with ${input.childNickname} feeling peaceful and ready for sleep.`;
}

export function buildPrompt(input: PromptInput): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
  };
}
