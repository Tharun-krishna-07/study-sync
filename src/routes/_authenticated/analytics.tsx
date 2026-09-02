import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Your analytics — StudySync" },
      { name: "description", content: "XP over time, assessment scores, study minutes and your strong and weak topics." },
      { property: "og:title", content: "Your analytics — StudySync" },
      { property: "og:description", content: "Track XP, scores, study time and topic strengths." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["personal-analytics", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: xp }, { data: assessments }, { data: parts }] = await Promise.all([
        supabase
          .from("xp_transactions")
          .select("amount, created_at")
          .eq("user_id", user!.id)
          .order("created_at"),
        supabase
          .from("assessments")
          .select("score, feedback, topics, completed_at")
          .eq("user_id", user!.id)
          .not("score", "is", null)
          .order("completed_at"),
        supabase.from("session_participants").select("total_minutes").eq("user_id", user!.id),
      ]);

      const xpByDay = new Map<string, number>();
      let running = 0;
      for (const t of xp ?? []) {
        running += t.amount;
        xpByDay.set(new Date(t.created_at).toLocaleDateString(), running);
      }

      const topicScores = new Map<string, number[]>();
      for (const a of assessments ?? []) {
        for (const topic of a.topics ?? []) {
          topicScores.set(topic, [...(topicScores.get(topic) ?? []), Number(a.score)]);
        }
      }
      const topicAvg = Array.from(topicScores.entries()).map(([topic, scores]) => ({
        topic,
        score: Math.round(scores.reduce((x, y) => x + y, 0) / scores.length),
      }));

      return {
        xpSeries: Array.from(xpByDay, ([date, value]) => ({ date, value })),
        scoreSeries: (assessments ?? []).map((a, i) => ({
          name: `#${i + 1}`,
          score: Number(a.score),
        })),
        minutes: (parts ?? []).reduce((sum, p) => sum + (p.total_minutes ?? 0), 0),
        sessions: parts?.length ?? 0,
        assessments: assessments?.length ?? 0,
        topicAvg,
      };
    },
  });

  const strong = (data?.topicAvg ?? []).filter((t) => t.score >= 70);
  const weak = (data?.topicAvg ?? []).filter((t) => t.score < 70);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Your analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here comes from your real sessions and assessments.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total XP", value: profile?.total_xp ?? 0 },
          { label: "Longest streak", value: `${profile?.longest_streak ?? 0} d` },
          { label: "Learning time", value: `${data?.minutes ?? 0} min` },
          { label: "Assessments", value: data?.assessments ?? 0 },
        ].map((c) => (
          <div key={c.label} className="surface-card p-4">
            <p className="text-xl font-semibold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold">XP over time</h2>
          {(data?.xpSeries.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No XP earned yet.</p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data!.xpSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold">Assessment scores</h2>
          {(data?.scoreSeries.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No assessments completed yet.
            </p>
          ) : (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data!.scoreSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="score" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold text-status-active">Strong topics</h2>
          {strong.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Not enough data yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {strong.map((t) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span>
                  <span className="text-muted-foreground">{t.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold text-status-upcoming">Needs work</h2>
          {weak.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing flagged yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {weak.map((t) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span>
                  <span className="text-muted-foreground">{t.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(data?.sessions ?? 0) === 0 && (
        <EmptyState
          title="No sessions attended yet."
          description="Join a live session or tune in to a study room to start building your history."
        />
      )}
    </div>
  );
}
