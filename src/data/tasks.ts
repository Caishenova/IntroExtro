import type { Task } from '../types/index.ts';

/**
 * Task pool moved from UI components (01 Dashboard, 02 Task Library, 03 Reflection Space).
 * Original content preserved verbatim.
 */
export const INITIAL_TASKS: Task[] = [
  {
    id: 'warm-greeting',
    title: 'The Warm Greeting',
    category: 'Daily Practice',
    difficulty: 'Beginner',
    time: '5 min',
    description: "Practice making intentional eye contact and saying a single, clear 'hello' to someone you pass today. No small talk required."
  },
  {
    id: 'friendly-nod',
    title: 'The Friendly Nod',
    category: 'Non-verbal Connection',
    difficulty: 'Beginner',
    time: '3 min',
    description: 'Practice simple non-verbal connection by acknowledging a stranger with a soft, gentle nod.'
  },
  {
    id: 'asking-a-follow-up',
    title: 'Asking a Follow-up',
    category: 'Listening',
    difficulty: 'Intermediate',
    time: '8 min',
    description: 'Wait for a natural pause and ask a question starting with "How did that make you feel?"'
  },
  {
    id: 'small-talk-entry',
    title: 'Small Talk Entry',
    category: 'Social Anxiety',
    difficulty: 'Advanced',
    time: '15 min',
    description: 'Enter a small group discussion in a low-stakes environment like a coffee shop line or workshop.'
  },
  {
    id: 'mirroring-body-language',
    title: 'Mirroring Body Language',
    category: 'Non-verbal Connection',
    difficulty: 'Beginner',
    time: '5 min',
    description: 'Subtly reflect the posture of your conversation partner to build subconscious rapport.'
  },
  {
    id: 'finding-silence',
    title: 'Finding Silence in a Crowded Room',
    category: 'Reflection',
    difficulty: 'Beginner',
    time: '5 min',
    chapter: 'Chapter 02 • Reflection',
    description: 'Think back to the last time you were in a busy space. Instead of focusing on the noise, what was one small detail you noticed that brought you peace? Describe that moment and how it felt to focus inward.'
  }
];
