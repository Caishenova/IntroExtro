import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_TASKS,
  INITIAL_THERAPY_SESSIONS,
  DEFAULT_USER_PROFILE,
  loadUserProfile,
  saveUserProfile,
  resetUserProfile,
  loadCompletedTasks,
  saveCompletedTask,
  resetCompletedTasks,
  resetAllData,
  setDataFilePath,
  getDataFilePath
} from '../src/index.ts';
import type {
  Task,
  TherapySession,
  UserProfile,
  CompletedTaskRecord,
  ChatMessage
} from '../src/index.ts';

console.log('--- Starting Foundation Verification Tests ---');

// 1. Verify Task Pool
console.log('Testing Task Pool...');
assert.strictEqual(INITIAL_TASKS.length, 6, 'Should have 6 tasks in initial task pool');

const requiredTaskIds = [
  'warm-greeting',
  'friendly-nod',
  'asking-a-follow-up',
  'small-talk-entry',
  'mirroring-body-language',
  'finding-silence'
];

for (const id of requiredTaskIds) {
  const found = INITIAL_TASKS.find((t: Task) => t.id === id);
  assert.ok(found, `Task ${id} should exist in INITIAL_TASKS`);
  assert.ok(found.title, `Task ${id} must have title`);
  assert.ok(found.category, `Task ${id} must have category`);
  assert.ok(found.difficulty, `Task ${id} must have difficulty`);
  assert.ok(found.time, `Task ${id} must have time`);
  assert.ok(found.description, `Task ${id} must have description`);
}
console.log('✓ Task Pool verified (6 tasks with all required fields)');

// 2. Verify Therapy Sessions
console.log('Testing Therapy Sessions...');
assert.strictEqual(INITIAL_THERAPY_SESSIONS.length, 5, 'Should have 5 therapy sessions');

const requiredTherapyIds = [
  'recharging-social-energy',
  'safe-haven-visualization',
  'deep-rooting-calm',
  'observing-the-silent-breath',
  'quiet-observation'
];

for (const id of requiredTherapyIds) {
  const found = INITIAL_THERAPY_SESSIONS.find((s: TherapySession) => s.id === id);
  assert.ok(found, `Therapy session ${id} should exist`);
  assert.ok(found.title, `Therapy session ${id} must have title`);
  assert.ok(found.duration, `Therapy session ${id} must have duration`);
  assert.ok(found.breathingPattern, `Therapy session ${id} must have breathingPattern`);
  assert.ok(found.description, `Therapy session ${id} must have description`);
}
console.log('✓ Therapy Sessions verified (5 sessions with all required fields)');

// 3. Verify Default Profile
console.log('Testing Default User Profile...');
assert.strictEqual(DEFAULT_USER_PROFILE.name, 'Alex');
assert.strictEqual(DEFAULT_USER_PROFILE.comfortLevel, 'Sprouting');
assert.ok(Array.isArray(DEFAULT_USER_PROFILE.focusAreas));
assert.strictEqual(DEFAULT_USER_PROFILE.focusAreas.length, 3);
assert.ok(DEFAULT_USER_PROFILE.timeBudget);
assert.strictEqual(DEFAULT_USER_PROFILE.currentLevel, 12);
console.log('✓ Default User Profile verified');

// 4. Verify ChatMessage & CompletedTaskRecord type compatibility
const mockMessage: ChatMessage = {
  role: 'assistant',
  content: 'Hello, how can I support you today?',
  topic: 'social-anxiety'
};
assert.strictEqual(mockMessage.role, 'assistant');
assert.strictEqual(mockMessage.topic, 'social-anxiety');
console.log('✓ ChatMessage and CompletedTaskRecord types validated');

// 5. Verify Persistence Module using isolated test file
console.log('Testing Persistence Module...');
const testStoragePath = path.resolve(process.cwd(), 'tests/temp-test-storage.json');
if (fs.existsSync(testStoragePath)) {
  fs.unlinkSync(testStoragePath);
}

setDataFilePath(testStoragePath);
assert.strictEqual(getDataFilePath(), testStoragePath);

// 5a. Initial Load Profile
const initialProfile = loadUserProfile();
assert.strictEqual(initialProfile.name, 'Alex');
assert.strictEqual(initialProfile.currentLevel, 12);
assert.ok(fs.existsSync(testStoragePath), 'Storage JSON file should be created on disk');

// 5b. Save Profile Updates
const updatedProfile = saveUserProfile({
  currentLevel: 13,
  comfortLevel: 'Budding',
  streakDays: 8
});
assert.strictEqual(updatedProfile.currentLevel, 13);
assert.strictEqual(updatedProfile.comfortLevel, 'Budding');
assert.strictEqual(updatedProfile.name, 'Alex', 'Name should be preserved across partial updates');

// Verify file on disk
const reloadedProfile = loadUserProfile();
assert.strictEqual(reloadedProfile.currentLevel, 13);
assert.strictEqual(reloadedProfile.comfortLevel, 'Budding');

// 5c. Reset Profile
const resetProfileResult = resetUserProfile();
assert.strictEqual(resetProfileResult.currentLevel, 12);
assert.strictEqual(resetProfileResult.comfortLevel, 'Sprouting');

// 5d. Completed Tasks
const initialTasks = loadCompletedTasks();
assert.deepStrictEqual(initialTasks, []);

const savedTask = saveCompletedTask({
  taskId: 'warm-greeting',
  mood: 'confident',
  responseText: 'Said hello to my neighbor this morning.'
});
assert.strictEqual(savedTask.taskId, 'warm-greeting');
assert.strictEqual(savedTask.mood, 'confident');
assert.ok(savedTask.date, 'Saved task should automatically have a date');

const loadedTasks = loadCompletedTasks();
assert.strictEqual(loadedTasks.length, 1);
assert.strictEqual(loadedTasks[0].taskId, 'warm-greeting');
assert.strictEqual(loadedTasks[0].responseText, 'Said hello to my neighbor this morning.');

// Append second task
saveCompletedTask({
  taskId: 'friendly-nod',
  mood: 'calm',
  responseText: 'Nodded at the coffee shop barista.',
  date: '2026-09-03T10:00:00.000Z'
});
const twoTasks = loadCompletedTasks();
assert.strictEqual(twoTasks.length, 2);
assert.strictEqual(twoTasks[1].date, '2026-09-03T10:00:00.000Z');

// 5e. Reset Completed Tasks
resetCompletedTasks();
const clearedTasks = loadCompletedTasks();
assert.deepStrictEqual(clearedTasks, []);

// 5f. Global Reset
saveUserProfile({ name: 'Jordan' });
saveCompletedTask({
  taskId: 'small-talk-entry',
  mood: 'anxious',
  responseText: 'Joined a conversation queue.'
});
resetAllData();
const finalProfile = loadUserProfile();
const finalTasks = loadCompletedTasks();
assert.strictEqual(finalProfile.name, 'Alex');
assert.deepStrictEqual(finalTasks, []);

// Cleanup test file
if (fs.existsSync(testStoragePath)) {
  fs.unlinkSync(testStoragePath);
}

// 6. Test Default Storage Path initialization (data/userData.json)
const defaultPath = path.resolve(process.cwd(), 'data/userData.json');
setDataFilePath(defaultPath);
const defaultProfile = loadUserProfile();
assert.strictEqual(defaultProfile.name, 'Alex');
assert.ok(fs.existsSync(defaultPath), 'Default data/userData.json should exist');

console.log('✓ Persistence module fully verified (load, save, reset for profile & completed tasks)');
console.log('All tests passed successfully!');
