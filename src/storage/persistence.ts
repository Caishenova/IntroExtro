import fs from 'node:fs';
import path from 'node:path';
import type { UserProfile, CompletedTaskRecord, AppStorageState } from '../types/index.ts';
import { DEFAULT_USER_PROFILE } from '../data/profile.ts';

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_DATA_FILE = path.join(DEFAULT_DATA_DIR, 'userData.json');

let currentFilePath = DEFAULT_DATA_FILE;

// In-memory fallback if filesystem is unavailable (e.g. browser context)
let memoryStore: AppStorageState | null = null;

function hasFileSystem(): boolean {
  return typeof process !== 'undefined' && typeof fs !== 'undefined' && typeof fs.readFileSync === 'function';
}

/**
 * Configure the file path for data storage (useful for isolated tests or custom app environments).
 */
export function setDataFilePath(filePath: string): void {
  currentFilePath = filePath;
}

/**
 * Get the current storage file path.
 */
export function getDataFilePath(): string {
  return currentFilePath;
}

/**
 * Returns default initial application state.
 */
export function getInitialState(): AppStorageState {
  return {
    profile: { ...DEFAULT_USER_PROFILE },
    completedTasks: [],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Ensure storage directory and file exist with initial content.
 */
function ensureStorageFile(): void {
  if (!hasFileSystem()) {
    if (!memoryStore) {
      memoryStore = getInitialState();
    }
    return;
  }

  const dir = path.dirname(currentFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(currentFilePath)) {
    const initialState = getInitialState();
    fs.writeFileSync(currentFilePath, JSON.stringify(initialState, null, 2), 'utf-8');
  }
}

/**
 * Read the entire app storage state from the JSON file.
 */
export function readRawStorage(): AppStorageState {
  ensureStorageFile();

  if (!hasFileSystem()) {
    return memoryStore || getInitialState();
  }

  try {
    const raw = fs.readFileSync(currentFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      profile: parsed.profile || { ...DEFAULT_USER_PROFILE },
      completedTasks: Array.isArray(parsed.completedTasks) ? parsed.completedTasks : [],
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch (error) {
    console.warn(`[Storage] Failed to parse ${currentFilePath}. Falling back to default state.`, error);
    const fallback = getInitialState();
    writeRawStorage(fallback);
    return fallback;
  }
}

/**
 * Write the entire app storage state to the JSON file.
 */
export function writeRawStorage(state: AppStorageState): void {
  state.updatedAt = new Date().toISOString();

  if (!hasFileSystem()) {
    memoryStore = { ...state };
    return;
  }

  const dir = path.dirname(currentFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(currentFilePath, JSON.stringify(state, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// User Profile Persistence Functions
// ---------------------------------------------------------------------------

/**
 * Load the user profile from persistent JSON storage.
 */
export function loadUserProfile(): UserProfile {
  const state = readRawStorage();
  return { ...state.profile };
}

/**
 * Save / update the user profile in persistent JSON storage.
 * Performs a shallow merge with existing profile fields.
 */
export function saveUserProfile(profileUpdates: Partial<UserProfile>): UserProfile {
  const state = readRawStorage();
  const updatedProfile: UserProfile = {
    ...state.profile,
    ...profileUpdates
  };

  writeRawStorage({
    ...state,
    profile: updatedProfile
  });

  return updatedProfile;
}

/**
 * Reset the user profile back to the default profile.
 */
export function resetUserProfile(): UserProfile {
  const state = readRawStorage();
  const resetProfile = { ...DEFAULT_USER_PROFILE };

  writeRawStorage({
    ...state,
    profile: resetProfile
  });

  return resetProfile;
}

// ---------------------------------------------------------------------------
// Completed Tasks History Persistence Functions
// ---------------------------------------------------------------------------

/**
 * Load all completed task records from persistent JSON storage.
 */
export function loadCompletedTasks(): CompletedTaskRecord[] {
  const state = readRawStorage();
  return [...state.completedTasks];
}

/**
 * Save a new completed task record to persistent JSON storage.
 * Automatically adds an ISO timestamp if date is omitted.
 */
export function saveCompletedTask(
  record: Omit<CompletedTaskRecord, 'date'> & { date?: string }
): CompletedTaskRecord {
  const fullRecord: CompletedTaskRecord = {
    taskId: record.taskId,
    mood: record.mood,
    responseText: record.responseText,
    date: record.date || new Date().toISOString()
  };

  const state = readRawStorage();
  const updatedTasks = [...state.completedTasks, fullRecord];

  writeRawStorage({
    ...state,
    completedTasks: updatedTasks
  });

  return fullRecord;
}

/**
 * Reset completed tasks history back to an empty list.
 */
export function resetCompletedTasks(): void {
  const state = readRawStorage();
  writeRawStorage({
    ...state,
    completedTasks: []
  });
}

// ---------------------------------------------------------------------------
// Global Storage Reset
// ---------------------------------------------------------------------------

/**
 * Reset all persistent app data (both user profile and completed tasks).
 */
export function resetAllData(): void {
  writeRawStorage(getInitialState());
}
