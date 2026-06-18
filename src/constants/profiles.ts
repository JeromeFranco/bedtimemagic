import type { ChildProfile } from '@/types';

export const SEED_PROFILES: ChildProfile[] = [
  {
    id: 'profile-buddy',
    user_id: 'seed',
    name: 'Buddy',
    developmental_stage: 'early_primary',
    protagonist: 'barnaby',
    emoji: '🌟',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'profile-sparky',
    user_id: 'seed',
    name: 'Sparky',
    developmental_stage: 'preschool',
    protagonist: 'nova',
    emoji: '⭐',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'profile-rocket',
    user_id: 'seed',
    name: 'Rocket',
    developmental_stage: 'older_kids',
    protagonist: 'pip',
    emoji: '🚀',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'profile-sunny',
    user_id: 'seed',
    name: 'Sunny',
    developmental_stage: 'preschool',
    protagonist: 'luna',
    emoji: '☀️',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'profile-pixel',
    user_id: 'seed',
    name: 'Pixel',
    developmental_stage: 'early_primary',
    protagonist: 'rex',
    emoji: '🎮',
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const DEFAULT_PROFILE_ID = 'profile-buddy';
