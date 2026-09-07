import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LeaderboardTable } from "@/routes/_authenticated/leaderboard";
import { supabase } from "@/integrations/supabase/client";
import { generateWeeklyReport } from "@/lib/ai.functions";
import { fetchGroupMembers, fetchWeeklyXp, friendlyError } from "@/lib/db";
import { startOfWeek } from "@/lib/format";

type ReportData = { narrative: string; recommendation: string };

export function GroupInsights({
  groupId,
  groupName,
  subject,
}: {
  groupId: string;
  groupName: string;
  subject: string;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const weekStart = startOfWeek();
  const weekStartKey = weekStart.toISOString().slice(0, 10);

  const { data: report } = useQuery({
    queryKey: ["weekly-report", groupId, weekStartKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("report_data, week_start, week_end")
        .eq("group_id", groupId)
        .eq("week_start", weekStartKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function generate() {
    setBusy(true);
    try {
      const [members, weekly, sessions, assessments] = await Promise.all([
        fetchGroupMembers(groupId),
        fetchWeeklyXp(groupId),
        supabase
          .from("study_sessions")
          .select("title, status")
          .eq("group_id", groupId)
          .gte("start_time", weekStart.toISOString()),
        supabase
          .from("assessments")
          .select("score, topics")
          .eq("group_id", groupId)
          .gte("created_at", weekStart.toISOString()),
      ]);

      const scores = (assessments.data ?? [])
        .map((a) => a.score)
        .filter((s): s is number => typeof s === "number");
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

      const stats = [
        `Members: ${members.length}`,
        `XP earned this week: ${[...weekly.values()].reduce((a, b) => a + b, 0)}`,
        `Sessions this week: ${(sessions.data ?? []).length}`,
        `Assessments taken: ${(assessments.data ?? []).length}`,
        `Average assessment score: ${avg === null ? "no data" : `${avg}%`}`,
        `Topics practised: ${
          [...new Set((assessments.data ?? []).flatMap((a) => a.topics ?? []))].join(", ") || "none"
        }`,
      ].join("\n");

      const result = (await generateWeeklyReport({
        data: { groupName, subject, stats },
      })) as ReportData;

      const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
      const { error } = await supabase.from("weekly_reports").insert({
        group_id: groupId,
        week_start: weekStartKey,
        week_end: weekEnd,
        report_data: result,
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["weekly-report", groupId, weekStartKey] });
      toast.success("Weekly report ready");
    } catch (err) {
      toast.error(friendlyError(err, "Could not create the report right now."));
    } finally {
      setBusy(false);
    }
  }

  const data = report?.report_data as ReportData | undefined;

  return (
    <div className="space-y-6">
      <section className="surface-card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">This week&apos;s report</h3>
            <p className="text-xs text-muted-foreground">
              Week of {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
          {!data && (
            <Button size="sm" onClick={() => void generate()} disabled={busy}>
              <Sparkles className="size-4" /> {busy ? "Writing…" : "Generate report"}
            </Button>
          )}
        </div>
        {data ? (
          <div className="space-y-2 text-sm">
            <p>{data.narrative}</p>
            <p className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <span className="text-muted-foreground">Next week: </span>
              {data.recommendation}
            </p>
          </div>
        ) : (
          <EmptyState
            title="No report yet"
            description="Generate a summary of this week's XP, sessions and assessment results."
          />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Group leaderboard</h3>
        <LeaderboardTable groupId={groupId} />
      </section>
    </div>
  );
}
