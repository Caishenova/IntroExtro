import type { TherapySession } from '../types/index.ts';

/**
 * Therapy and wellness sessions moved from UI components (05 Quiet Space / Wellness Tab).
 * Original content preserved verbatim.
 */
export const INITIAL_THERAPY_SESSIONS: TherapySession[] = [
  {
    id: 'recharging-social-energy',
    title: 'Recharging Social Energy',
    duration: '15 min',
    breathingPattern: 'Guided Reflection (4-2-4 calm pacing)',
    description: 'Guided reflection to recharge social energy.',
    category: 'Stress Relief'
  },
  {
    id: 'safe-haven-visualization',
    title: 'Safe Haven Visualization',
    duration: '10 min',
    breathingPattern: 'Box Breathing (4-4-4-4)',
    description: 'Create a mental retreat for overstimulation.',
    category: 'Stress Relief'
  },
  {
    id: 'deep-rooting-calm',
    title: 'Deep Rooting Calm',
    duration: '20 min',
    breathingPattern: '4-7-8 Relaxing Breath',
    description: 'Grounding your mind for restorative rest.',
    category: 'Sleep'
  },
  {
    id: 'observing-the-silent-breath',
    title: 'Observing the Silent Breath',
    duration: '5 min',
    breathingPattern: 'Equal Breathing (5-5)',
    description: 'Quick focus check-in for busy environments.',
    category: 'Breathing'
  },
  {
    id: 'quiet-observation',
    title: 'Quiet Observation',
    duration: '12 min',
    breathingPattern: 'Mindful natural rhythm',
    description: 'Sharpening social focus through calm awareness.',
    category: 'Focus'
  }
];
