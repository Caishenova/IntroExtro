/**
 * Core Data Models & Shared Types for the Quiet Growth App
 */

/**
 * User profile capturing settings, communication comfort, and progress.
 */
export interface UserProfile {
  name: string;
  comfortLevel: string;
  focusAreas: string[];
  timeBudget: string;
  currentLevel: number;
  streakDays?: number;
  tasksDone?: number;
  pointsEarned?: number;
  identityTitle?: string;
  identityDescription?: string;
}

/**
 * Communication practice or challenge task.
 */
export interface Task {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  time: string;
  description: string;
  chapter?: string;
}

/**
 * Record of a completed task including reflection and mood state.
 */
export interface CompletedTaskRecord {
  taskId: string;
  mood: string;
  responseText: string;
  date: string; // ISO 8601 string
}

/**
 * Message in conversation with Sage AI guide.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  topic: string;
  timestamp?: string;
}

/**
 * Guided therapy or calming meditation session.
 */
export interface TherapySession {
  id: string;
  title: string;
  duration: string;
  breathingPattern: string;
  description: string;
  category?: string;
}

/**
 * Complete app state schema stored in persistent JSON storage.
 */
export interface AppStorageState {
  profile: UserProfile;
  completedTasks: CompletedTaskRecord[];
  updatedAt: string;
}
