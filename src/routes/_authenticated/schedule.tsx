import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyGroups } from "@/lib/db";
import { dayLabel, timeRange, sessionState } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — StudySync" },
      { name: "description", content: "All upcoming and past study sessions across your groups." },
      { property: "og:title", content: "Schedule — StudySync" },
      { property: "og:description", content: "Your upcoming study sessions." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { user } = useAuth();

  const { data: groups = [] } = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyGroups(user!.id),
  });
  const groupIds = groups.map((g) => g.id);

  const { data: sessions = [] } = useQuery({
    queryKey: ["all-sessions", groupIds.join(",")],
    enabled: groupIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*, groups(name)")
        .in("group_id", groupIds)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upcoming = sessions.filter((s) => sessionState(s.start_time, s.end_time) !== "completed");
  const past = sessions
    .filter((s) => sessionState(s.start_time, s.end_time) === "completed")
    .reverse();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions are created inside a group — open a group's Schedule tab to add one.
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Your schedule is clear."
          description="Open one of your groups and schedule a study session."
          action={
            <Button asChild size="sm">
              <Link to="/groups">Go to groups</Link>
            </Button>
          }
        />
      ) : (
        <>
          <SessionList title="Upcoming & live" items={upcoming} />
          <SessionList title="Completed" items={past} />
        </>
      )}
    </div>
  );
}

type SessionItem = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  groups: unknown;
};

function SessionList({ title, items }: { title: string; items: SessionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.map((s) => {
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
    </section>
  );
}
