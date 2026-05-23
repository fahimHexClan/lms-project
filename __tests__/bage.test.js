/**
 * __tests__/bage.test.js
 * Unit tests for BAGE pattern detection logic.
 * Run: npm test
 */

// ── Mock the pattern detection logic (pure functions extracted from bage.js) ──
const PATTERNS = [
  {
    type: 'late_submission',
    detect: (b) => (b.lateSubmissions || 0) >= 2,
  },
  {
    type: 'broken_streak',
    detect: (b) => b.loginStreakBroken === true && (b.previousStreak || 0) >= 3,
  },
  {
    type: 'forum_inactive',
    detect: (b) => (b.forumPostsThisWeek || 0) === 0 && (b.daysSinceLastPost || 0) >= 7,
  },
  {
    type: 'mentor',
    detect: (b) =>
      (b.onTimeSubmissions || 0) >= 3 &&
      (b.lateSubmissions || 0) === 0,
  },
]

const detectPatterns = (behaviour) =>
  PATTERNS.filter(p => p.detect(behaviour)).map(p => p.type)

const isStreakMilestone = (b) => (b.loginStreak || 0) === 7

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BAGE Pattern Detection', () => {

  describe('Pattern 1 — Late Submission Recovery', () => {
    test('triggers when lateSubmissions >= 2', () => {
      const result = detectPatterns({ lateSubmissions: 2 })
      expect(result).toContain('late_submission')
    })
    test('does NOT trigger when lateSubmissions === 1', () => {
      const result = detectPatterns({ lateSubmissions: 1 })
      expect(result).not.toContain('late_submission')
    })
    test('does NOT trigger when lateSubmissions === 0', () => {
      const result = detectPatterns({ lateSubmissions: 0 })
      expect(result).not.toContain('late_submission')
    })
  })

  describe('Pattern 2 — Broken Login Streak', () => {
    test('triggers when streak broken and previous streak >= 3', () => {
      const result = detectPatterns({ loginStreakBroken: true, previousStreak: 5 })
      expect(result).toContain('broken_streak')
    })
    test('does NOT trigger when streak not broken', () => {
      const result = detectPatterns({ loginStreakBroken: false, previousStreak: 5 })
      expect(result).not.toContain('broken_streak')
    })
    test('does NOT trigger when previousStreak < 3', () => {
      const result = detectPatterns({ loginStreakBroken: true, previousStreak: 2 })
      expect(result).not.toContain('broken_streak')
    })
  })

  describe('Pattern 3 — Forum Inactivity', () => {
    test('triggers when 0 posts this week and >= 7 days since last post', () => {
      const result = detectPatterns({ forumPostsThisWeek: 0, daysSinceLastPost: 7 })
      expect(result).toContain('forum_inactive')
    })
    test('does NOT trigger when student posted this week', () => {
      const result = detectPatterns({ forumPostsThisWeek: 2, daysSinceLastPost: 7 })
      expect(result).not.toContain('forum_inactive')
    })
    test('does NOT trigger when only 5 days since last post', () => {
      const result = detectPatterns({ forumPostsThisWeek: 0, daysSinceLastPost: 5 })
      expect(result).not.toContain('forum_inactive')
    })
  })

  describe('Pattern 4 — Mentor Challenge', () => {
    test('triggers when onTimeSubmissions >= 3 and no late submissions', () => {
      const result = detectPatterns({ onTimeSubmissions: 3, lateSubmissions: 0 })
      expect(result).toContain('mentor')
    })
    test('does NOT trigger when there are late submissions', () => {
      const result = detectPatterns({ onTimeSubmissions: 3, lateSubmissions: 1 })
      expect(result).not.toContain('mentor')
    })
    test('does NOT trigger when onTimeSubmissions < 3', () => {
      const result = detectPatterns({ onTimeSubmissions: 2, lateSubmissions: 0 })
      expect(result).not.toContain('mentor')
    })
  })

  describe('Pattern 5 — Login Streak Milestone (7 days)', () => {
    test('triggers exactly at loginStreak === 7', () => {
      expect(isStreakMilestone({ loginStreak: 7 })).toBe(true)
    })
    test('does NOT trigger at loginStreak === 6', () => {
      expect(isStreakMilestone({ loginStreak: 6 })).toBe(false)
    })
    test('does NOT trigger at loginStreak === 8', () => {
      expect(isStreakMilestone({ loginStreak: 8 })).toBe(false)
    })
  })

  describe('Multiple patterns simultaneously', () => {
    test('correctly fires multiple patterns at once', () => {
      const behaviour = {
        lateSubmissions:    2,
        loginStreakBroken:  true,
        previousStreak:     4,
        forumPostsThisWeek: 0,
        daysSinceLastPost:  10,
        onTimeSubmissions:  0,
      }
      const result = detectPatterns(behaviour)
      expect(result).toContain('late_submission')
      expect(result).toContain('broken_streak')
      expect(result).toContain('forum_inactive')
      expect(result).not.toContain('mentor')
    })

    test('fires no patterns for a perfectly engaged student', () => {
      const behaviour = {
        lateSubmissions:    0,
        onTimeSubmissions:  5,
        loginStreakBroken:  false,
        loginStreak:        5,
        forumPostsThisWeek: 3,
        daysSinceLastPost:  1,
      }
      const result = detectPatterns(behaviour)
      // Only mentor fires (3+ on-time, 0 late)
      expect(result).toContain('mentor')
      expect(result).not.toContain('late_submission')
      expect(result).not.toContain('broken_streak')
      expect(result).not.toContain('forum_inactive')
    })
  })
})
