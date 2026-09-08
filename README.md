# Study Sync Hub

# StudySync — Lovable Build Prompt

Build a full-stack collaborative learning platform called **StudySync**.
Tagline: *Learn Together. Stay Connected. Grow Together.*

It's a study-room + Discord-style presence + AI tutor + gamification platform for students learning programming/other subjects together with friends.

---

## 0. GOLDEN RULE — NO HARDCODED USER DATA

Never hardcode any student name, score, or profile info anywhere in the app (no "Tharun", "Arun", etc. as real data).
- All names, scores, XP, progress, group members, leaderboard entries come **dynamically from the database**, driven by the authenticated user's session.
- Use placeholders like `{authenticatedUser.firstName}`, `{member.name}` in code/UI logic.
- For demo/empty UI states, use generic placeholders: "Your Name", "Member 1", "Student Name" — never real-looking fake data.
- If demo data must be shown before auth is wired up, label it clearly as **"Demo Data"**.
- Renaming a user should propagate everywhere automatically (single source of truth in Users table).

---

## 1. AUTHENTICATION & ONBOARDING

Sign up / Login / Logout / Forgot password / Reset password / Profile edit.

**Signup fields:** full name, username, email, password, optional profile photo.

**Post-signup onboarding:** "What do you want to learn?" — multi-select (C, C++, Java, Python, JavaScript, HTML/CSS, SQL, Data Structures, Other, or "I'll decide later"). Save to profile.

---

## 2. MAIN DASHBOARD

Header: `Good Morning, {user.firstName} 👋`

**Learning Overview cards** (all dynamic): current streak, total XP, groups joined, sessions this week, average assessment score.

**Today's Schedule:** list of `{Group Name} / {Topic} / {Start–End Time} / Status (Upcoming/Live/Completed)` with a "View Session" button.

**Currently Studying** (real-time, one of the core hooks):
```
🔴 Currently Studying
🟢 {Member} — 🎧 Tuned In
🟢 {Member} — 🎥 Video Call
🟢 {Member} — 📞 Voice Call
```
Empty state: "Nobody from your groups is studying right now."

---

## 3. GROUPS

Create / Join (code or link) / Leave / Invite friends.

**Create group fields:** name, subject, description, optional image, learning goal, start date, target completion date.

**Group dashboard:** name, subject, description, overall progress (`64% completed`), and a live "Currently Studying" panel showing every member's state: 🟢 Tuned In · 🎥 Video Call · 📞 Voice Call · ⚪ Offline · 🔴 Left.

---

## 3.5 DISCORD-STYLE MECHANICS

The app should feel and behave like Discord under the hood, not just visually.

**Groups = Servers.** Each group is its own space with its own channels, roles, and members — not a single flat page.

**Channels inside each group:**
- Text channels: `#general`, `#doubts`, `#resources` (or custom, admin-created)
- Voice channels: persistent, always-on rooms members can freely join/leave anytime (not just during a scheduled session) — e.g. `🔊 Study Room`, `🔊 Voice Hangout`
- Optional video channel/room, same drop-in-drop-out model

**Persistent voice, Discord-style:**
- Joining a voice channel is instant — no "session" required to start it. Anyone can hop into `🔊 Study Room` at any time and others already inside are visible immediately, mic/cam controls (mute/deafen/camera toggle) like Discord.
- Scheduled **Study Sessions** (Section 5) are a separate, optional layer on top — they pin a topic/time to a channel, but the channel itself is always joinable.
- Show a live member list per voice channel with speaking indicators (highlight avatar when talking).

**Roles & permissions (Discord-style):**
- Roles: Owner, Admin/Moderator, Member (extendable later).
- Admins can create/rename/delete channels, manage roles, kick/ban from group, pin messages, manage invites.
- Reuse this role system for permissions checks everywhere (Section 14 Security) instead of a flat owner/member split.

**Presence system:**
- Global user presence (Discord-style): 🟢 Online, 🌙 Idle, ⛔ Do Not Disturb, ⚪ Offline — shown on avatars app-wide.
- Layer the existing Tune In / Video / Voice states (Section 4) on top of presence *within* a group: a user can be 🟢 Online globally and specifically "🎧 Tuned In" or in a voice channel within a given group.

**Chat, Discord-style:**
- `@mentions` (user and `@everyone`/`@here` equivalents scoped to the group), message replies/threads, emoji reactions, pinned messages, typing indicators.
- Server-style member list sidebar per group showing who's online/in-voice right now.

**Invites:** Discord-style invite links/codes to join a group, shareable and (optionally) expiring.

---

## 4. TUNE IN — CORE DIFFERENTIATOR

Available both during a scheduled session and any time someone drops into a group's persistent voice channel (Section 3.5) — three non-forced options:
- **🎥 Join Video Call** — full participation
- **📞 Join Voice Call** — audio only
- **🎧 Tune In** — study independently while visibly "present" to the group

Pressing Tune In sets status to 🟢 Tuned In, visible to group instantly as `{Name} — 🎧 Tuned In`. Goal: peer presence without call pressure ("my friends are studying, so I'll study too").

**Session states:** `OFFLINE → UPCOMING → TUNED_IN / VIDEO_CALL / VOICE_CALL → LEFT → COMPLETED`

**Join/leave tracking:** record student, session, join time, mode; show real-time toast (`🟢 {Name} joined`, `⚪ {Name} left`); track leave time and total participation (`54 / 60 min`) for analytics — framed as accountability, not punishment.

---

## 5. STUDY SESSIONS & SCHEDULING

**Create session fields:** topic, date, start/end time, description, learning resource, optional breaks, optional meeting link.

**Scheduling:** one-time or recurring (e.g. Mon/Wed/Fri 7 PM); calendar + list views.

**Break system:** creator defines intervals (e.g. 25 min study / 5 min break); live countdown shown as "☕ Break Time — resumes in {countdown}".

**Live session page:** 🔴 LIVE badge, topic, group, time range, live countdown timer, big Video/Voice/Tune-In buttons (Tune In visually prominent), real-time member list with status icons.

**Session completion (auto at end time):** show duration, topics covered, resource used, your participation time, participant count → CTA **"🤖 Take AI Assessment"**.

**Video/Voice calls:** architect for future Google Meet / real-time voice-video integration. For MVP, allow admin to attach a meeting URL — never fake a working call that isn't implemented.

---

## 6. LEARNING RESOURCES & ROADMAP

**Resources** (per group): YouTube, articles, docs, PDFs, websites, notes. Store title, URL, topic, added-by, date, completion status. Paste a YouTube URL → auto-fetch title/thumbnail/channel/duration where possible; link to a topic. Never download copyrighted video.

**Roadmap** (per group, customizable): ordered topic list with status icons (✅ done / 🟡 in progress / 🔒 locked). Admins can add/edit/delete/reorder/mark-complete.

---

## 7. AI LEARNING ASSISTANT

After each session: **"What did you learn today?"** — free-text box → **"Generate My Assessment"**.

**Assessment generation** uses: stated topics, group roadmap, past assessments, performance history, difficulty level, known weak areas. Question types: MCQ, true/false, short answer, output-prediction, debugging, coding, explanation.

**Results view:** overall score % + per-topic breakdown, plus AI feedback in three sections — *what you understand well*, *what needs improvement*, *recommended practice*.

**Adaptive difficulty:** raise difficulty on consistent success; on struggle, give easier questions + explanations before ramping back up. Persist a per-student learning memory (topics studied, scores, weak/strong concepts, past mistakes, completed resources) and use it in future assessment generation. Occasionally generate mixed-concept challenges spanning several learned topics to test real application, not memorization.

---

## 8. DOUBTS, CHAT, SOCIAL

**Doubt board (per group):** question, author, AI-generated explanation, member replies, resolved toggle.

**Group chat:** real-time messages, emoji/reactions, replies, timestamps, plus system messages (`🟢 {Name} started studying`, `🎧 {Name} tuned in`, `🏆 {Name} completed an assessment`, etc.).

---

## 9. GAMIFICATION

**XP:** session complete +30, assessment complete +40 (+bonus if excellent), coding challenge +30, help resolve a doubt +10, weekly goal +100. Log every event in an XP transaction table.

**Leaderboard:** weekly, per group, ranked purely from real XP — never hardcoded. Reward learning/consistency/assessments/coding/helping others, not just hours logged.

**Streaks:** current streak, longest streak, sessions this week.

---

## 10. ANALYTICS & REPORTS

**Personal analytics:** total XP, streaks, assessment average, sessions attended, learning time, topics completed, problems solved, strong/weak topics — with charts.

**Group analytics:** overall progress, topic completion, sessions completed, avg score, participation, weekly XP, consistency — keep individual data appropriately private within the group view.

**Weekly AI report (per group):** group performance (planned vs completed sessions, avg score, topics done) + per-member breakdown (attendance, participation, avg score, problems solved, XP, topics done) + a short AI narrative insight (e.g. "strong on syntax, needs functions practice") + next-week topic recommendation.

---

## 11. NAVIGATION

**Desktop sidebar:** Dashboard · Groups · My Learning · Schedule · AI Tutor · Leaderboard · Analytics · Notifications · Settings. Mobile: bottom nav with the top items.

**Inside a group:** Overview · Study Room · Schedule · Resources · Topics · Doubts · Chat · Leaderboard · Analytics.

**Notifications:** upcoming/starting session, friend joined/tuned in/left, assessment available/completed, weekly report ready, new doubt, group milestone.

**Profile page:** edit name, username, photo, learning interests, preferred study times — propagates everywhere on save.

---

## 12. REAL-TIME REQUIREMENTS

Live updates needed for: group chat, Tune In status, online status, join/leave activity, session participant list, session timer, leaderboard (where practical).

---

## 13. DATABASE SCHEMA (suggested)

| Table | Key fields |
|---|---|
| Users | id, name, username, email, profile_image, learning_interests, created_at |
| Groups | id, name, subject, description, owner_id, invite_code, created_at |
| GroupMembers | id, group_id, user_id, role, joined_at |
| Channels | id, group_id, name, type (text/voice/video), created_by, created_at |
| Topics | id, group_id, title, description, order, status |
| Resources | id, group_id, topic_id, title, url, resource_type, added_by, created_at |
| StudySessions | id, group_id, channel_id, topic_id, title, start_time, end_time, meeting_url, created_by |
| SessionParticipants | id, session_id, user_id, participation_mode, joined_at, left_at, total_minutes |
| Messages | id, group_id, channel_id, user_id, message, reply_to, created_at |
| Doubts | id, group_id, user_id, question, status, created_at |
| Assessments | id, user_id, session_id, topics, score, feedback, created_at |
| Questions | id, assessment_id, question, type, difficulty, correct_answer |
| Answers | id, question_id, user_id, answer, is_correct |
| XPTransactions | id, user_id, group_id, amount, reason, created_at |
| WeeklyReports | id, group_id, week_start, week_end, report_data, created_at |
| Notifications | id, user_id, type, message, read, created_at |

---

## 14. SECURITY

- Users can only access groups they belong to, edit their own profile/messages, view group info as a member, create sessions per group permissions, and access their own private assessments.
- Enforce the Discord-style role system (Section 3.5): Owner/Admin actions (manage channels, roles, kick/ban, invites) are server-side gated, not just hidden in the UI.
- Never expose passwords or auth secrets to the client.

---

## 15. UX DETAILS

**Empty states:** "You haven't joined a study group yet." (Create/Join buttons) · "Your schedule is clear." (Schedule a Session) · "Add your first learning resource." · "No doubts yet. Be the first to ask a question."

**Error handling:** user-friendly messages for failed create/join, invalid invite code, failed session load, AI assessment unavailable, invalid YouTube URL, network error — never expose raw backend errors.

**Responsive:** works cleanly on desktop/laptop/tablet/mobile; live session page especially mobile-optimized with an easy-to-tap Tune In button.

**Visual design:** dark-first UI, slightly lighter cards, subtle gradients, rounded corners, clean typography, modern icons, soft shadows, minimal/professional animations, strong hierarchy. Status colors used meaningfully: 🟢 active/studying, 🟡 upcoming, 🔴 live, ⚪ offline — don't overuse bright colors.

**Micro-interactions:** subtle animation on join/tune-in/leave, XP gain, task/topic completion, leaderboard position change, assessment completion.

---

## 16. PRODUCT PHILOSOPHY

Every screen should serve one of three questions:
1. **What should I learn?** → roadmap + resources + schedule
2. **Who is learning with me?** → groups + Tune In + presence + calls
3. **Did I actually understand it?** → AI assessment + quizzes + feedback

**Core user flow:** Sign up → Create/Join group → Choose subject → Build roadmap → Add resources → Schedule session → Session runs (Video/Voice/Tune In) → Session ends → "What did you learn today?" → AI assessment → XP + progress + leaderboard update → weekly AI report → next week's plan.

---

## 17. BUILD PRIORITY

**MVP (build first):** Auth & profiles · Create/join groups · Group dashboard · Study sessions + scheduling · Learning resources + YouTube links · Tune In + join/leave presence · Session timer + break timer · AI learning input → AI quiz → AI assessment · XP + leaderboard · Weekly report · Group chat · Doubt board · Personal dashboard.

**Phase 2 (architect for, build later):** Google Meet integration · real-time voice/video rooms · collaborative code editor + execution · AI pair programming · AI-generated roadmaps · advanced analytics · more subjects · public communities · friend system · achievements/badges · study challenges.

---

## 18. FINAL QUALITY BAR

This must feel like one connected product, not disconnected screens: every button does something real, navigation works, forms persist to the database, groups↔members↔sessions↔assessments↔XP are all properly linked, and Tune In / join-leave / leaderboard / weekly reports all reflect real live data — never static or hardcoded. Clean, scalable architecture that can grow from MVP to full platform. Polished, fast, intuitive, genuinely useful for students studying together.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bd48416-17a3-4327-9e0d-d213ed1b74bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
