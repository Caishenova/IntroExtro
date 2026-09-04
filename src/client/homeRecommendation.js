/**
 * Client-Side Recommendation Store for Home Screen (Petite-Vue compatible)
 * Works as both an ES module, CommonJS, and standalone browser script (<script src="...">).
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.todayPracticeStore = exports.todayPracticeStore;
    root.createTodayPracticeStore = exports.createTodayPracticeStore;
    root.getLocalFallback = exports.getLocalFallback;
    root.INITIAL_TASKS = exports.INITIAL_TASKS;
    root.DEFAULT_USER_PROFILE = exports.DEFAULT_USER_PROFILE;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const INITIAL_TASKS = [
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

  const DEFAULT_USER_PROFILE = {
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

  function loadClientProfile() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('introextro_user_profile');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return DEFAULT_USER_PROFILE;
  }

  function loadClientHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('introextro_completed_tasks');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return [];
  }

  function getLocalFallback(profile, history) {
    profile = profile || {};
    history = history || [];

    const recentIds = new Set(history.slice(-5).map(function (h) { return h.taskId; }));
    const uncompleted = INITIAL_TASKS.filter(function (t) { return !recentIds.has(t.id); });
    const pool = uncompleted.length > 0 ? uncompleted : INITIAL_TASKS;

    const currentLevel = profile.currentLevel !== undefined ? profile.currentLevel : 12;
    const targetDiff = currentLevel <= 5 ? 'Beginner' : currentLevel <= 15 ? 'Intermediate' : 'Advanced';
    const focusAreas = (profile.focusAreas || []).map(function (f) { return f.toLowerCase(); });

    // Match both difficulty and focus area
    const fullMatch = pool.find(function (t) {
      const diffMatch = t.difficulty.toLowerCase() === targetDiff.toLowerCase();
      const focusMatch = focusAreas.some(function (area) {
        return t.category.toLowerCase().includes(area) || t.title.toLowerCase().includes(area);
      });
      return diffMatch && focusMatch;
    });

    if (fullMatch) {
      return {
        taskId: fullMatch.id,
        reason: 'Selected for your ' + targetDiff.toLowerCase() + ' level and focus on ' + fullMatch.category.toLowerCase() + '.'
      };
    }

    // Match focus area
    const focusMatch = pool.find(function (t) {
      return focusAreas.some(function (area) {
        return t.category.toLowerCase().includes(area) || t.title.toLowerCase().includes(area);
      });
    });

    if (focusMatch) {
      return {
        taskId: focusMatch.id,
        reason: 'Aligned with your focus on ' + focusMatch.category.toLowerCase() + '.'
      };
    }

    // Match difficulty
    const diffMatch = pool.find(function (t) {
      return t.difficulty.toLowerCase() === targetDiff.toLowerCase();
    });

    if (diffMatch) {
      return {
        taskId: diffMatch.id,
        reason: 'Matched to your current practice level (' + targetDiff + ').'
      };
    }

    return {
      taskId: pool[0].id,
      reason: 'A gentle practice to build quiet confidence today.'
    };
  }

  function createTodayPracticeStore() {
    return {
      loading: true,
      task: INITIAL_TASKS[0],
      reason: '',
      source: '',
      async fetchRecommendation() {
        this.loading = true;
        const profile = loadClientProfile();
        const history = loadClientHistory();

        let fetchedSuccess = false;

        if (typeof fetch === 'function') {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(function () { controller.abort(); }, 4500) : null;

          try {
            const res = await fetch('http://localhost:3000/recommend-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile: profile, history: history }),
              signal: controller ? controller.signal : undefined
            });

            if (timeoutId) clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const matched = INITIAL_TASKS.find(function (t) { return t.id === data.taskId; });
              if (matched) {
                this.task = matched;
                this.reason = data.reason || '';
                this.source = 'ai';
                this.loading = false;
                fetchedSuccess = true;
                return;
              }
            }
          } catch (err) {
            if (timeoutId) clearTimeout(timeoutId);
          }
        }

        if (!fetchedSuccess) {
          const fallback = getLocalFallback(profile, history);
          const matched = INITIAL_TASKS.find(function (t) { return t.id === fallback.taskId; }) || INITIAL_TASKS[0];
          this.task = matched;
          this.reason = fallback.reason;
          this.source = 'fallback';
          this.loading = false;
        }
      }
    };
  }

  const store = createTodayPracticeStore();
  store.fetchRecommendation();

  return {
    INITIAL_TASKS: INITIAL_TASKS,
    DEFAULT_USER_PROFILE: DEFAULT_USER_PROFILE,
    getLocalFallback: getLocalFallback,
    createTodayPracticeStore: createTodayPracticeStore,
    todayPracticeStore: store
  };
});
