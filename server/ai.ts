import type { UserProfile, CompletedTaskRecord, Task } from '../src/types/index.ts';
import { INITIAL_TASKS } from '../src/data/tasks.ts';

export interface AiRecommendationResult {
  taskId: string;
  reason: string;
}

export interface RecommendTaskPayload {
  profile?: Partial<UserProfile>;
  history?: CompletedTaskRecord[];
}

/**
 * Builds a prompt for the AI model describing the user's profile, history, and available task pool.
 */
export function buildRecommendationPrompt(
  profile: Partial<UserProfile>,
  history: CompletedTaskRecord[],
  taskPool: Task[]
): string {
  const profileSummary = [
    `- Name: ${profile.name || 'Friend'}`,
    `- Current Level: ${profile.currentLevel ?? 12}`,
    `- Comfort Level: ${profile.comfortLevel || 'Sprouting'}`,
    `- Focus Areas: ${(profile.focusAreas || ['Small Groups', 'Deep Listening']).join(', ')}`,
    `- Time Budget: ${profile.timeBudget || '15 min/day'}`
  ].join('\n');

  const historySummary = (history && history.length > 0)
    ? history.slice(-5).map(h => `- Task ID: ${h.taskId} | Mood: ${h.mood} | Completed: ${h.date}`).join('\n')
    : 'No recently completed tasks.';

  const tasksSummary = taskPool.map(t =>
    `- [ID: ${t.id}] "${t.title}" (${t.difficulty}, ${t.time}, Category: ${t.category}): ${t.description}`
  ).join('\n');

  return `You are Sage, a thoughtful, empathetic AI mentor helping an introverted user gently stretch their comfort zone and develop their communication style.

USER PROFILE:
${profileSummary}

RECENT COMPLETED TASKS:
${historySummary}

AVAILABLE TASK POOL:
${tasksSummary}

INSTRUCTIONS:
1. Choose exactly ONE task ID from the available task pool that best fits the user's current level, aligns with their focus areas, and avoids recently completed tasks where possible.
2. Write a short, warm, encouraging, second-person reason (1-2 sentences, addressed directly to "you") explaining why this practice is ideal for them today.
3. Respond ONLY with a valid JSON object in this exact format:
{
  "taskId": "<valid-task-id-from-pool>",
  "reason": "<short, encouraging second-person reason>"
}`;
}

/**
 * Calls the AI provider using server-side environment variables.
 * Supports GEMINI_API_KEY (Google Gemini) and OPENAI_API_KEY (OpenAI).
 */
export async function getAiTaskRecommendation(
  payload: RecommendTaskPayload
): Promise<AiRecommendationResult> {
  const profile = payload.profile || {};
  const history = payload.history || [];
  const taskPool = INITIAL_TASKS;
  const prompt = buildRecommendationPrompt(profile, history, taskPool);

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    return await callGemini(geminiKey, prompt, taskPool);
  }

  if (openaiKey) {
    return await callOpenAI(openaiKey, prompt, taskPool);
  }

  throw new Error('NO_API_KEY: No AI provider API key found in server environment variables (GEMINI_API_KEY or OPENAI_API_KEY).');
}

/**
 * Call Google Gemini API (gemini-1.5-flash)
 */
async function callGemini(
  apiKey: string,
  prompt: string,
  taskPool: Task[]
): Promise<AiRecommendationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response.');
  }

  return parseAndValidateRecommendation(rawText, taskPool);
}

/**
 * Call OpenAI API (gpt-4o-mini)
 */
async function callOpenAI(
  apiKey: string,
  prompt: string,
  taskPool: Task[]
): Promise<AiRecommendationResult> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Sage, an empathetic AI coach for an introvert growth app. Output only valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('OpenAI API returned an empty response.');
  }

  return parseAndValidateRecommendation(rawText, taskPool);
}

/**
 * Helper to parse and sanitize JSON recommendation from model output.
 */
export function parseAndValidateRecommendation(
  rawJson: string,
  taskPool: Task[]
): AiRecommendationResult {
  // Strip markdown code block fences if present
  let cleanText = rawJson.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanText);
  const validIds = new Set(taskPool.map(t => t.id));

  let taskId = typeof parsed.taskId === 'string' ? parsed.taskId.trim() : '';
  let reason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';

  // Ensure chosen task exists in pool
  if (!validIds.has(taskId)) {
    console.warn(`[AI Recommendation] Model returned unknown taskId "${taskId}". Falling back to first available task.`);
    taskId = taskPool[0].id;
  }

  if (!reason) {
    reason = 'This practice is chosen to gently build your quiet confidence today.';
  }

  return { taskId, reason };
}
