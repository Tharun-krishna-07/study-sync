import { createFileRoute, Link } from "@tanstack/react-router";
import { Headphones, Users, Sparkles, Trophy, CalendarClock, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudySync — Learn Together. Stay Connected. Grow Together." },
      {
        name: "description",
        content:
          "Study with your friends in live rooms, tune in without call pressure, track progress with AI assessments, and climb your group leaderboard.",
      },
      { property: "og:title", content: "StudySync — Learn Together. Stay Connected." },
      {
        property: "og:description",
        content:
          "Collaborative study rooms with live presence, scheduled sessions, AI assessments and gamified progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Headphones,
    title: "Tune In, no pressure",
    body: "Study independently while visibly present to your group. No camera, no mic — just presence that keeps everyone accountable.",
  },
  {
    icon: Users,
    title: "Group servers & channels",
    body: "Every group gets text and always-on voice channels. Drop in and out whenever you like.",
  },
  {
    icon: CalendarClock,
    title: "Sessions & break timers",
    body: "Schedule one-off or recurring sessions with built-in study/break intervals and a live countdown.",
  },
  {
    icon: Sparkles,
    title: "AI assessments",
    body: "Tell it what you learned; get an adaptive quiz, a scored breakdown and honest feedback.",
  },
  {
    icon: Trophy,
    title: "XP & leaderboards",
    body: "Real XP from real learning — sessions, assessments, and helping others. Never hardcoded.",
  },
  {
    icon: MessagesSquare,
    title: "Doubts & chat",
    body: "Ask questions, get AI explanations, and let your group jump in with replies.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <main className="hero-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold">
          Study<span className="text-gradient">Sync</span>
        </span>
        <Button asChild size="sm">
          <Link to={session ? "/dashboard" : "/auth"}>
            {session ? "Open dashboard" : "Sign in"}
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Collaborative learning platform
        </p>
        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">
          Learn Together.
          <br />
          <span className="text-gradient">Stay Connected. Grow Together.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          StudySync gives your study group persistent rooms, live presence, scheduled sessions and
          an AI tutor that actually checks whether you understood it.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to={session ? "/dashboard" : "/auth"}>
              {session ? "Go to dashboard" : "Get started free"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth" search={{ mode: "login" }}>
              I already have an account
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface-card animate-rise-in p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
