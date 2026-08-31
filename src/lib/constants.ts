export const SUBJECTS = [
  "C",
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "HTML/CSS",
  "SQL",
  "Data Structures",
  "Other",
] as const;

export const XP_REWARDS = {
  session_complete: 30,
  assessment_complete: 40,
  assessment_excellent_bonus: 20,
  coding_challenge: 30,
  doubt_resolved: 10,
  weekly_goal: 100,
} as const;

export type ParticipationMode = "tuned_in" | "voice_call" | "video_call";

export const MODE_META: Record<ParticipationMode, { label: string; icon: string }> = {
  tuned_in: { label: "Tuned In", icon: "🎧" },
  voice_call: { label: "Voice Call", icon: "📞" },
  video_call: { label: "Video Call", icon: "🎥" },
};

export const PRESENCE_META: Record<string, { label: string; icon: string }> = {
  online: { label: "Online", icon: "🟢" },
  idle: { label: "Idle", icon: "🌙" },
  dnd: { label: "Do Not Disturb", icon: "⛔" },
  offline: { label: "Offline", icon: "⚪" },
};

export function statusDotClass(kind: "live" | "active" | "upcoming" | "offline" | "idle") {
  switch (kind) {
    case "live":
      return "bg-status-live";
    case "active":
      return "bg-status-active";
    case "upcoming":
      return "bg-status-upcoming";
    case "idle":
      return "bg-status-idle";
    default:
      return "bg-status-offline";
  }
}
