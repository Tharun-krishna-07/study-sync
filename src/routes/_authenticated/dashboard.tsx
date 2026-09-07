import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Flame, Zap, Users, CalendarCheck, GraduationCap, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, firstName } from "@/hooks/useAuth";
import { fetchMyGroups, fetchLivePresence, touchStreak } from "@/lib/db";
import { greeting, timeRange, dayLabel, sessionState, startOfWeek } from "@/lib/format";
import { MODE_META, type ParticipationMode } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudySync" },
      { name: "description", content: "Your streak, XP, today's sessions and who is studying right now." },
      { property: "og:title", content: "Dashboard — StudySync" },
      { property: "og:description", content: "Your streak, XP, sessions and live study presence." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyGroups(user!.id),
  });

  const groupIds = groups.map((g) => g.id);

  const { data: sessions = [] } = useQuery({
    queryKey: ["today-sessions", groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date();
      to.setHours(23, 59, 59, 999);
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*, groups(name)")
        .in("group_id", groupIds)
        .gte("start_time", from.toISOString())
        .lte("start_time", to.toISOString())
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: presence = [] } = useQuery({
    queryKey: ["live-presence", groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: () => fetchLivePresence(groupIds),
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = startOfWeek().toISOString();
      const [{ data: parts }, { data: assessments }] = await Promise.all([
        supabase
          .from("session_participants")
          .select("id, total_minutes, joined_at")
          .eq("user_id", user!.id)
          .gte("joined_at", weekStart),
        supabase.from("assessments").select("score").eq("user_id", user!.id).not("score", "is", null),
      ]);
      const scores = (assessments ?? []).map((a) => Number(a.score));
      return {
        sessionsThisWeek: parts?.length ?? 0,
        avgScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
      };
    },
  });

  useEffect(() => {
    if (groupIds.length === 0) return;
    const channel = supabase
      .channel("dashboard-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_presence" }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-presence", groupIds.join(",")] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupIds.join(","), queryClient]);

  useEffect(() => {
    if (!user?.id) return;
    void touchStreak(user.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    });
  }, [user?.id, queryClient]);


  const cards = [
    { label: "Current streak", value: `${profile?.current_streak ?? 0} days`, icon: Flame },
    { label: "Total XP", value: `${profile?.total_xp ?? 0}`, icon: Zap },
    { label: "Groups joined", value: `${groups.length}`, icon: Users },
    { label: "Sessions this week", value: `${stats?.sessionsThisWeek ?? 0}`, icon: CalendarCheck },
    {
      label: "Avg assessment",
      value: stats?.avgScore != null ? `${stats.avgScore}%` : "—",
      icon: GraduationCap,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {greeting()}, {firstName(profile)} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening across your study groups today.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="surface-card animate-rise-in p-4">
            <c.icon className="size-4 text-primary" />
            <p className="mt-3 text-xl font-semibold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Today's schedule
          </h2>
          {sessions.length === 0 ? (
            <EmptyState
              title="Your schedule is clear."
              description="Plan a session with your group to keep the momentum going."
              action={
                <Button asChild size="sm">
                  <Link to="/schedule">Schedule a Session</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => {
                const state = sessionState(s.start_time, s.end_time);
                return (
                  <li key={s.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {(s.groups as { name: string } | null)?.name ?? "Group"} · {s.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dayLabel(s.start_time)} · {timeRange(s.start_time, s.end_time)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        state === "live" && "border-status-live text-status-live",
                        state === "upcoming" && "border-status-upcoming text-status-upcoming",
                        state === "completed" && "text-muted-foreground",
                      )}
                    >
                      {state}
                    </Badge>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}>
                        View Session
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Radio className="size-4 text-status-live" /> Currently studying
          </h2>
          <div className="surface-card p-4">
            {presence.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nobody from your groups is studying right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {presence.map((p) => {
                  const prof = p.profiles as unknown as {
                    full_name: string;
                    avatar_url: string | null;
                    presence: string;
                  };
                  const meta = MODE_META[p.mode as ParticipationMode] ?? MODE_META.tuned_in;
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <UserAvatar
                        name={prof?.full_name}
                        url={prof?.avatar_url}
                        presence="online"
                        className="size-8"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{prof?.full_name || "Member"}</p>
                        <p className="text-xs text-muted-foreground">
                          {meta.icon} {meta.label}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {groups.length === 0 && (
            <EmptyState
              title="You haven't joined a study group yet."
              action={
                <Button asChild size="sm">
                  <Link to="/groups">Create or join a group</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
