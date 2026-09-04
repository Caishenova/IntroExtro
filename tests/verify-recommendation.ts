import assert from 'node:assert';
import http from 'node:http';
import {
  INITIAL_TASKS,
  DEFAULT_USER_PROFILE,
  getLocalFallbackRecommendation,
  getTodayTaskRecommendation
} from '../src/index.ts';
import type {
  Task,
  CompletedTaskRecord,
  UserProfile
} from '../src/index.ts';
import {
  buildRecommendationPrompt,
  parseAndValidateRecommendation
} from '../server/ai.ts';
import { createRecommendationServer } from '../server/index.ts';

console.log('--- Starting Task Recommendation & Backend Verification Tests ---');

// ============================================================================
// 1. Test Local Fallback Rule
// ============================================================================
console.log('Testing Local Fallback Rule...');

// 1a. Intermediate Level (12) + Deep Listening Focus
const profileListening: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  currentLevel: 12,
  focusAreas: ['Deep Listening']
};
const recListening = getLocalFallbackRecommendation(profileListening, []);
assert.strictEqual(recListening.taskId, 'asking-a-follow-up', 'Should match intermediate listening task');
assert.ok(recListening.reason.length > 0, 'Should have encouraging reason');
assert.strictEqual(recListening.source, 'fallback');
console.log('✓ Intermediate + Deep Listening matched to "asking-a-follow-up"');

// 1b. Beginner Level (3) + Non-verbal Connection Focus
const profileBeginner: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  currentLevel: 3,
  focusAreas: ['Non-verbal Connection']
};
const recBeginner = getLocalFallbackRecommendation(profileBeginner, []);
assert.ok(['warm-greeting', 'friendly-nod', 'mirroring-body-language'].includes(recBeginner.taskId));
console.log(`✓ Beginner level matched to ${recBeginner.taskId}`);

// 1c. Advanced Level (18) + Social Anxiety Focus
const profileAdvanced: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  currentLevel: 18,
  focusAreas: ['Social Anxiety']
};
const recAdvanced = getLocalFallbackRecommendation(profileAdvanced, []);
assert.strictEqual(recAdvanced.taskId, 'small-talk-entry');
console.log('✓ Advanced level matched to "small-talk-entry"');

// 1d. Exclude recently completed tasks
const recentHistory: CompletedTaskRecord[] = [
  { taskId: 'asking-a-follow-up', mood: 'calm', responseText: 'done', date: '2026-09-04T10:00:00Z' }
];
const recExclude = getLocalFallbackRecommendation(profileListening, recentHistory);
assert.notStrictEqual(recExclude.taskId, 'asking-a-follow-up', 'Should not recommend recently completed task');
console.log(`✓ Recently completed task excluded, recommended next best: ${recExclude.taskId}`);

// ============================================================================
// 2. Test Prompt Builder & Recommendation Parser
// ============================================================================
console.log('Testing AI Prompt Builder & Sanitizer...');

const prompt = buildRecommendationPrompt(DEFAULT_USER_PROFILE, [], INITIAL_TASKS);
assert.ok(prompt.includes('Alex'), 'Prompt must contain user name');
assert.ok(prompt.includes('Deep Listening'), 'Prompt must contain focus areas');
assert.ok(prompt.includes('warm-greeting'), 'Prompt must contain available task pool');
console.log('✓ Prompt builder verified');

// 2b. Clean JSON Parsing
const parsedClean = parseAndValidateRecommendation(
  JSON.stringify({ taskId: 'friendly-nod', reason: 'You are ready to try gentle eye contact.' }),
  INITIAL_TASKS
);
assert.strictEqual(parsedClean.taskId, 'friendly-nod');
assert.strictEqual(parsedClean.reason, 'You are ready to try gentle eye contact.');

// 2c. Markdown-wrapped JSON Parsing
const parsedMarkdown = parseAndValidateRecommendation(
  '```json\n{"taskId": "finding-silence", "reason": "Take a quiet moment today."}\n```',
  INITIAL_TASKS
);
assert.strictEqual(parsedMarkdown.taskId, 'finding-silence');

// 2d. Hallucinated task ID fallback
const parsedInvalid = parseAndValidateRecommendation(
  JSON.stringify({ taskId: 'non-existent-task-999', reason: 'Do this!' }),
  INITIAL_TASKS
);
assert.strictEqual(parsedInvalid.taskId, INITIAL_TASKS[0].id, 'Should fallback to valid task from pool');
console.log('✓ AI parser and hallucination defense verified');

// ============================================================================
// 3. Test Backend HTTP Server & Fallback Integration
// ============================================================================
console.log('Testing Backend Server Endpoints...');

const TEST_PORT = 3199;
const server = createRecommendationServer();

await new Promise<void>((resolve) => {
  server.listen(TEST_PORT, () => resolve());
});

try {
  // 3a. Health Check GET /health
  const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  console.log('✓ GET /health returned 200 OK');

  // 3b. CORS Preflight OPTIONS /recommend-task
  const optionsRes = await fetch(`http://localhost:${TEST_PORT}/recommend-task`, {
    method: 'OPTIONS'
  });
  assert.strictEqual(optionsRes.status, 204);
  assert.strictEqual(optionsRes.headers.get('access-control-allow-origin'), '*');
  console.log('✓ CORS OPTIONS preflight verified');

  // 3c. POST /recommend-task without API Key
  const postRes = await fetch(`http://localhost:${TEST_PORT}/recommend-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: DEFAULT_USER_PROFILE, history: [] })
  });
  assert.strictEqual(postRes.status, 503, 'Should return 503 when no AI key configured');
  const postErr = await postRes.json();
  assert.strictEqual(postErr.code, 'NO_API_KEY');
  console.log('✓ POST /recommend-task returned 503 NO_API_KEY as expected');

  // 3d. Client service getTodayTaskRecommendation with fallback
  const clientRec = await getTodayTaskRecommendation({
    profile: profileListening,
    history: [],
    endpointUrl: `http://localhost:${TEST_PORT}/recommend-task`,
    timeoutMs: 1000
  });
  assert.ok(clientRec.taskId, 'Client must receive a valid taskId');
  assert.strictEqual(clientRec.source, 'fallback', 'Client should gracefully fall back to local rule');
  assert.strictEqual(clientRec.taskId, 'asking-a-follow-up');
  console.log('✓ Client service gracefully executed local fallback on 503 server response');

  // 3e. Client service timeout fallback test
  const timeoutRec = await getTodayTaskRecommendation({
    profile: profileListening,
    history: [],
    endpointUrl: `http://localhost:3198/unreachable`, // non-existent port
    timeoutMs: 500
  });
  assert.strictEqual(timeoutRec.source, 'fallback');
  assert.ok(timeoutRec.taskId);
  console.log('✓ Client service gracefully executed local fallback on timeout/unreachable server');

} finally {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

console.log('All recommendation and backend verification tests passed successfully!');
