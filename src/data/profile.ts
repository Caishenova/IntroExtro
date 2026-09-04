import type { UserProfile } from '../types/index.ts';

/**
 * Default initial UserProfile reflecting data from 01 Dashboard & 06 Profile screens.
 */
export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Alex',
  comfortLevel: 'Sprouting',
  focusAreas: ['Small Groups', 'Deep Listening', 'Observational Wit'],
  timeBudget: '15 min/day',
  currentLevel: 12,
  streakDays: 7,
  tasksDone: 48,
  pointsEarned: 2400,
  identityTitle: 'Thoughtful Navigator',
  identityDescription: 'You lead with observation and empathy, excelling in small groups where depth is valued over volume.'
};
