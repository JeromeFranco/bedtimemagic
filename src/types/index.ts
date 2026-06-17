export type Protagonist = 'barnaby' | 'nova' | 'pip' | 'luna' | 'rex';

export interface ProtagonistInfo {
  id: Protagonist;
  name: string;
  species: string;
  emoji: string;
}

export const PROTAGONISTS: ProtagonistInfo[] = [
  { id: 'barnaby', name: 'Barnaby', species: 'Bear', emoji: '🐻' },
  { id: 'nova', name: 'Captain Nova', species: 'Star Pilot', emoji: '🚀' },
  { id: 'pip', name: 'Pip', species: 'Penguin', emoji: '🐧' },
  { id: 'luna', name: 'Luna', species: 'Owl', emoji: '🦉' },
  { id: 'rex', name: 'Rex', species: 'Dragon', emoji: '🐉' },
];

export type ChallengeCategory = 'screentime' | 'emotions' | 'bedtime' | 'social';

export interface ChallengeCategoryInfo {
  id: ChallengeCategory;
  label: string;
  emoji: string;
}

export const CHALLENGE_CATEGORIES: ChallengeCategoryInfo[] = [
  { id: 'screentime', label: 'Screen Time Limits', emoji: '📱' },
  { id: 'emotions', label: 'Big Emotions / Anger', emoji: '😤' },
  { id: 'bedtime', label: 'Bedtime Friction', emoji: '🌙' },
  { id: 'social', label: 'Social Skills', emoji: '🤝' },
];

export type ChallengeTrigger =
  | 'stopping_games' | 'turning_off_tv' | 'giving_back_tablet'
  | 'yelling' | 'hitting' | 'tantrum_no'
  | 'leaving_bedroom' | 'refusing_teeth' | 'staying_up_late'
  | 'sharing_toys' | 'telling_truth' | 'chores_patience';

export interface ChallengeTriggerInfo {
  id: ChallengeTrigger;
  label: string;
  category: ChallengeCategory;
}

export const CHALLENGE_TRIGGERS: ChallengeTriggerInfo[] = [
  { id: 'stopping_games', label: 'Stopping video games', category: 'screentime' },
  { id: 'turning_off_tv', label: 'Turning off the TV', category: 'screentime' },
  { id: 'giving_back_tablet', label: 'Giving back the tablet', category: 'screentime' },
  { id: 'yelling', label: 'Yelling', category: 'emotions' },
  { id: 'hitting', label: 'Hitting/Pushing', category: 'emotions' },
  { id: 'tantrum_no', label: "Tantrum when told 'No'", category: 'emotions' },
  { id: 'leaving_bedroom', label: 'Leaving the bedroom', category: 'bedtime' },
  { id: 'refusing_teeth', label: 'Refusing to brush teeth', category: 'bedtime' },
  { id: 'staying_up_late', label: 'Wanting to stay up late', category: 'bedtime' },
  { id: 'sharing_toys', label: 'Sharing toys', category: 'social' },
  { id: 'telling_truth', label: 'Telling the truth', category: 'social' },
  { id: 'chores_patience', label: 'Chores and Patience', category: 'social' },
];

export type DevelopmentalStage = 'preschool' | 'early_primary' | 'older_kids';

export const DEVELOPMENTAL_STAGES: { id: DevelopmentalStage; label: string }[] = [
  { id: 'preschool', label: 'Preschool' },
  { id: 'early_primary', label: 'Early Primary' },
  { id: 'older_kids', label: 'Older Kids' },
];

export interface ChildProfile {
  id: string;
  user_id: string;
  name: string;
  developmental_stage: DevelopmentalStage;
  protagonist: Protagonist;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  child_id: string;
  title: string;
  story_text: string;
  moral: string;
  pillow_talk_prompt: string;
  sleepy_affirmation: string;
  cover_image_url: string | null;
  challenge: ChallengeTrigger;
  protagonist: Protagonist;
  created_at: string;
}

export interface LessonLog {
  id: string;
  user_id: string;
  story_id: string;
  child_id: string;
  rating: 'great' | 'okay' | 'missed';
  created_at: string;
}

export type StoryRating = LessonLog['rating'];
