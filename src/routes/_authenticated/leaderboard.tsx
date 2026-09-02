import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyGroups, fetchGroupMembers, fetchWeeklyXp } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — StudySync" },
      { name: "description", content: "Weekly XP rankings across your study groups, built from real activity." },
      { property: "og:title", content: "Leaderboard — StudySync" },
      { property: "og:description", content: "Weekly XP rankings from real study activity." },
    ],
  }),
  component: LeaderboardPage,
});

export function LeaderboardTable({ groupId }: { groupId?: string }) {
  const { user } = useAuth();

  const { data: rows = [] } = useQuery({
    queryKey: ["leaderboard", groupId ?? "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekly = await fetchWeeklyXp(groupId);
      let profiles: Array<{ id: string; full_name: string; avatar_url: string | null; presence: string; total_xp: number }>;

      if (groupId) {
        const members = await fetchGroupMembers(groupId);
        profiles = members
          .map((m) => m.profiles)
          .filter(Boolean)
          .map((p) => p!);
      } else {
        const groups = await fetchMyGroups(user!.id);
        const ids = new Set<string>();
        for (const g of groups) {
          const members = await fetchGroupMembers(g.id);
          members.forEach((m) => m.profiles && ids.add(m.profiles.id));
        }
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, presence, total_xp")
          .in("id", ids.size ? Array.from(ids) : [user!.id]);
        profiles = data ?? [];
      }

      return profiles
        .map((p) => ({ ...p, weekly_xp: weekly.get(p.id) ?? 0 }))
        .sort((a, b) => b.weekly_xp - a.weekly_xp || b.total_xp - a.total_xp);
    },
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No XP earned yet this week."
        description="Complete a session or an AI assessment to get on the board."
      />
    );
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className={cn(
            "surface-card flex items-center gap-3 p-4",
            row.id === user?.id && "border-primary/50",
          )}
        >
          <span
            className={cn(
              "w-7 text-center font-display text-sm font-semibold",
              i === 0 ? "text-xp" : "text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <UserAvatar name={row.full_name} url={row.avatar_url} presence={row.presence} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.full_name || "Student Name"}</p>
            <p className="text-xs text-muted-foreground">{row.total_xp} XP all-time</p>
          </div>
          <span className="font-display text-sm font-semibold text-primary">
            +{row.weekly_xp} XP
          </span>
        </li>
      ))}
    </ol>
  );
}

function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<string>("all");

  const { data: groups = [] } = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyGroups(user!.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This week's XP — earned from sessions, assessments and helping others.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setScope("all")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm",
            scope === "all"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-secondary text-secondary-foreground",
          )}
        >
          All my groups
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setScope(g.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm",
              scope === g.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary text-secondary-foreground",
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      <LeaderboardTable {...(scope === "all" ? {} : { groupId: scope })} />
    </div>
  );
}
