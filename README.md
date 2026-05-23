# EduCore LMS — Next-Gen Unified Enterprise LMS
### BSc (Hons) Computer Science Top Up — COM6301 Final Year Project
**Student:** N. M Mohamed Fahim | **ID:** 2528225

---

## 🚀 Quick Start (VS Code Terminal)

### Step 1 — Clone & Install
```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### Step 2 — Firebase Setup
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Go to https://console.firebase.google.com
# Create a new project, enable:
#   - Authentication (Email/Password)
#   - Firestore Database
#   - Storage
#   - Hosting
#   - Functions (requires Blaze plan for Cloud Functions)
```

### Step 3 — Environment Variables
```bash
# Copy the .env template
cp .env.example .env

# Edit .env and fill in your Firebase config values
# Get them from: Firebase Console → Project Settings → Your Apps → Web App
```

### Step 4 — Deploy Firestore Rules & Indexes
```bash
firebase deploy --only firestore
firebase deploy --only storage
```

### Step 5 — Run Locally
```bash
# Start the frontend dev server
npm run dev
# → Opens at http://localhost:5173

# In a separate terminal — run Firebase Emulators (for BAGE testing)
firebase emulators:start
# → Emulator UI at http://localhost:4000
```

### Step 6 — Deploy Cloud Functions (BAGE Engine)
```bash
# Requires Firebase Blaze plan (pay-as-you-go — stays free within limits)
firebase deploy --only functions
```

### Step 7 — Create First Admin Account
```bash
# In Firebase Console → Authentication → Add user manually
# Email: admin@educore.com  Password: admin123
# Then in Firestore → users → create doc with uid matching Auth uid:
# { email: "admin@educore.com", role: "admin", displayName: "Admin", points: 0, badges: [] }
# Admin can then create Student and Lecturer accounts from the /admin/users page
```

---

## 📁 Project Structure

```
lms-project/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── Sidebar.jsx          # Navigation + PageLayout wrapper
│   │   └── bage/
│   │       ├── ActiveChallenges.jsx # BAGE live challenge widget
│   │       └── Leaderboard.jsx      # Real-time points leaderboard
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── student/
│   │   │   ├── Dashboard.jsx        # Stats + challenges + upcoming assignments
│   │   │   ├── Content.jsx          # Browse & download materials
│   │   │   ├── Assignments.jsx      # Submit coursework + view grades
│   │   │   ├── Forum.jsx            # Threaded Q&A discussion
│   │   │   ├── Calendar.jsx         # Academic event calendar
│   │   │   └── Gamification.jsx     # Full badges + BAGE challenge history
│   │   ├── lecturer/
│   │   │   ├── Dashboard.jsx        # Submission + grading overview
│   │   │   ├── Content.jsx          # Upload PDFs and slides
│   │   │   ├── Assignments.jsx      # Create assignments + grade submissions
│   │   │   ├── Forum.jsx            # Shared forum
│   │   │   └── Calendar.jsx         # Create/manage events
│   │   └── admin/
│   │       ├── Dashboard.jsx        # Platform overview + BAGE status
│   │       ├── Users.jsx            # Create/manage accounts
│   │       ├── Analytics.jsx        # MIS dashboard + Excel export (SheetJS)
│   │       └── Calendar.jsx         # Admin calendar (same as lecturer)
│   ├── context/
│   │   └── AuthContext.jsx          # Firebase Auth + role management
│   ├── routes/
│   │   └── ProtectedRoute.jsx       # Role-based route guard
│   ├── services/
│   │   └── firebase.js              # Firebase initialisation
│   ├── App.jsx                      # Router setup
│   └── main.jsx                     # Entry point
├── functions/
│   ├── index.js                     # Exports all Cloud Functions
│   ├── bage.js                      # ⚡ BAGE Engine (primary contribution)
│   ├── auth.js                      # Login streak tracking
│   └── analytics.js                 # Weekly report generation
├── firestore/
│   ├── firestore.rules              # Security rules for all collections
│   └── firestore.indexes.json       # Composite query indexes
├── __tests__/
│   └── bage.test.js                 # Jest unit tests for BAGE patterns
├── storage.rules                    # Firebase Storage security rules
├── firebase.json                    # Deploy configuration + emulator ports
└── .env.example                     # Environment variable template
```

---

## ⚡ BAGE Engine — How It Works

The **Behaviour-Adaptive Gamification Engine** is the novel research contribution of this project.

### Architecture (3 layers)

**Layer 1 — Behaviour Tracking**
Every student action (submit assignment, login, forum post) updates a `userBehaviour/{userId}` Firestore document. This creates a continuously updated behavioural profile.

**Layer 2 — Pattern Detection (Cloud Function)**
Whenever `userBehaviour/{userId}` is written, a Firebase Cloud Function (`functions/bage.js`) triggers and evaluates 5 pattern thresholds:

| Pattern | Trigger Condition | Challenge | Reward |
|---|---|---|---|
| Late Submission | ≥ 2 late submissions | Submit next 2 on time | +25 pts + On-Track badge |
| Broken Streak | Streak broken after ≥ 3 days | Login 3 consecutive days | +15 pts + Comeback badge |
| Forum Inactive | 0 posts in 7 days | Post 1 question/answer | +20 pts + Discussion Spark badge |
| Consistent Early | 3+ on-time, 0 late | Answer 1 forum question | +30 pts + Mentor badge |
| 7-Day Milestone | loginStreak reaches 7 | Automatic reward | +50 pts + Week Warrior badge |

**Layer 3 — Adaptive Reward Delivery**
Challenges are written to `challenges/{userId_type}`. A Firestore real-time listener in the student dashboard displays them instantly (<500ms). Completing a challenge awards bonus points and unlocks a badge.

### Static vs BAGE Comparison (Objective 8)
The static gamification baseline (fixed points per action) is available on every page. The BAGE layer adds personalised, contextually responsive challenges on top. The UAT evaluation compares engagement metrics between both conditions.

---

## 🗄️ Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | User profiles, points, badges, login streak |
| `userBehaviour` | BAGE input: submission history, streak, forum activity |
| `challenges` | BAGE output: active/completed/expired personalised challenges |
| `materials` | Uploaded PDFs and lecture slides |
| `assignments` | Assignment definitions created by lecturers |
| `submissions` | Student file submissions + grades + feedback |
| `forumThreads` | Discussion thread posts |
| `forumReplies` | Thread replies |
| `events` | Academic calendar events |
| `milestones` | Automatic streak milestone awards |
| `weeklyReports` | Cached weekly analytics summaries |

---

## 🧪 Running Tests

```bash
# Run BAGE unit tests
npm test

# Run once (CI mode)
npm run test:ci
```

Tests cover all 5 BAGE pattern detection functions and edge cases.

---

## 📥 MIS Analytics Export

Admin Analytics page → **Export Excel** button generates a 4-sheet `.xlsx` report:
1. **Student Engagement** — per-student points, badges, streak, submissions, BAGE challenges
2. **Submissions** — full submission log with on-time status and grades
3. **BAGE Challenges** — complete challenge history with completion status
4. **Platform Summary** — aggregated KPIs for the report period

---

## 📋 Sprint Plan (Agile)

| Sprint | Dates | Deliverables |
|---|---|---|
| Sprint 1 | June 2026 | Auth, roles, routing, Firestore rules |
| Sprint 2 | Jun–Jul 2026 | Content library, assignment management |
| Sprint 3 | Jul–Aug 2026 | **BAGE engine**, static baseline, forum, calendar |
| Sprint 4 | August 2026 | MIS dashboard, integration testing, UAT |

---

## 🔧 Non-Functional Targets

| Metric | Target |
|---|---|
| BAGE Cloud Function execution | < 2 seconds |
| UI challenge update (Firestore listener) | < 500ms |
| Lighthouse performance score | ≥ 80 |
| Jest test pass rate | > 95% |
| Page load time | < 3 seconds |

---

## 📚 References

- Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? HICSS.
- Deterding, S. et al. (2011). From game design elements to gamefulness. MindTrek.
- Cidral, W. A. et al. (2018). E-learning success determinants. Computers & Education.
- Hevner, A. R. et al. (2004). Design science in IS research. MIS Quarterly.
- Nakamura, J. & Csikszentmihalyi, M. (2014). The concept of flow. Springer.
