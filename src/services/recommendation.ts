import type { UserProfile, CompletedTaskRecord, Task } from '../types/index.ts';
import { INITIAL_TASKS } from '../data/tasks.ts';

export interface TaskRecommendation {
  taskId: string;
  reason: string;
  source: 'ai' | 'fallback';
}

export interface RecommendationOptions {
  profile?: Partial<UserProfile>;
  history?: CompletedTaskRecord[];
  tasks?: Task[];
  endpointUrl?: string;
  timeoutMs?: number;
}

/**
 * Local Fallback Rule:
 * Pick a task matching the user's current level and one of their focus areas
 * that they haven't completed recently.
 */
export function getLocalFallbackRecommendation(
  profile: Partial<UserProfile> = {},
  history: CompletedTaskRecord[] = [],
  taskPool: Task[] = INITIAL_TASKS
): TaskRecommendation {
  if (!taskPool || taskPool.length === 0) {
    throw new Error('Task pool is empty.');
  }

  // 1. Identify recently completed task IDs (most recent 5)
  const recentCompletedIds = new Set((history || []).slice(-5).map(h => h.taskId));

  // 2. Filter pool to tasks not recently completed (or fallback to full pool if all completed)
  const uncompleted = taskPool.filter(t => !recentCompletedIds.has(t.id));
  const candidatePool = uncompleted.length > 0 ? uncompleted : taskPool;

  // 3. Map level to target difficulty:
  // Level 1-5: Beginner, Level 6-15: Intermediate, Level > 15: Advanced
  const currentLevel = profile.currentLevel ?? 12;
  const targetDifficulty = currentLevel <= 5
    ? 'Beginner'
    : currentLevel <= 15
      ? 'Intermediate'
      : 'Advanced';

  // 4. Extract focus areas in lowercase
  const focusAreas = (profile.focusAreas || []).map(f => f.toLowerCase());

  // Strategy A: Match both difficulty and focus area
  const bestMatch = candidatePool.find(task => {
    const diffMatch = task.difficulty.toLowerCase() === targetDifficulty.toLowerCase();
    const focusMatch = focusAreas.some(area =>
      task.category.toLowerCase().includes(area) ||
      task.title.toLowerCase().includes(area) ||
      task.description.toLowerCase().includes(area)
    );
    return diffMatch && focusMatch;
  });

  if (bestMatch) {
    return {
      taskId: bestMatch.id,
      reason: `Matched for your ${targetDifficulty.toLowerCase()} practice and focus on ${bestMatch.category.toLowerCase()}.`,
      source: 'fallback'
    };
  }

  // Strategy B: Match focus area
  const focusMatch = candidatePool.find(task =>
    focusAreas.some(area =>
      task.category.toLowerCase().includes(area) ||
      task.title.toLowerCase().includes(area)
    )
  );

  if (focusMatch) {
    return {
      taskId: focusMatch.id,
      reason: `Aligned with your goal of developing ${focusMatch.category.toLowerCase()}.`,
      source: 'fallback'
    };
  }

  // Strategy C: Match difficulty level
  const diffMatch = candidatePool.find(task =>
    task.difficulty.toLowerCase() === targetDifficulty.toLowerCase()
  );

  if (diffMatch) {
    return {
      taskId: diffMatch.id,
      reason: `Selected to match your current comfort level (${targetDifficulty}).`,
      source: 'fallback'
    };
  }

  // Strategy D: First candidate in filtered pool
  const fallbackTask = candidatePool[0];
  return {
    taskId: fallbackTask.id,
    reason: 'A gentle practice to build quiet confidence today.',
    source: 'fallback'
  };
}

/**
 * Fetch task recommendation from backend AI endpoint, with automatic timeout and local fallback.
 */
export async function getTodayTaskRecommendation(
  options: RecommendationOptions = {}
): Promise<TaskRecommendation> {
  const profile = options.profile || {};
  const history = options.history || [];
  const tasks = options.tasks || INITIAL_TASKS;
  const endpointUrl = options.endpointUrl || 'http://localhost:3000/recommend-task';
  const timeoutMs = options.timeoutMs ?? 5000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile, history }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Recommendation] Backend returned status ${response.status}. Using local fallback.`);
      return getLocalFallbackRecommendation(profile, history, tasks);
    }

    const data = await response.json();
    if (data && typeof data.taskId === 'string') {
      // Validate that task exists
      const exists = tasks.some(t => t.id === data.taskId);
      if (exists) {
        return {
          taskId: data.taskId,
          reason: data.reason || 'Recommended by Sage based on your profile.',
          source: 'ai'
        };
      }
    }

    console.warn('[Recommendation] Invalid AI response shape. Using local fallback.');
    return getLocalFallbackRecommendation(profile, history, tasks);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`[Recommendation] AI call timed out after ${timeoutMs}ms. Using local fallback.`);
    } else {
      console.warn(`[Recommendation] Backend unreachable: ${error.message}. Using local fallback.`);
    }
    return getLocalFallbackRecommendation(profile, history, tasks);
  }
}
