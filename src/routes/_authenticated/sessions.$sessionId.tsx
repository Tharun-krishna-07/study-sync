import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { awardXp, friendlyError } from "@/lib/db";
import { countdown, dayLabel, sessionState, timeRange } from "@/lib/format";
import { MODE_META, XP_REWARDS, type ParticipationMode } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [
      { title: "Study session — StudySync" },
      { name: "description", content: "Join the session, pick how you're studying and track your time." },
      { property: "og:title", content: "Study session — StudySync" },
      { property: "og:description", content: "Join your group's live study session." },
    ],
  }),
  component: SessionDetail,
});

const MODES: ParticipationMode[] = ["tuned_in", "voice_call", "video_call"];

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  void now;

  const { data: session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*, groups(id, name, subject)")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["session-participants", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_participants")
        .select(
          "id, user_id, participation_mode, joined_at, left_at, total_minutes, profiles:profiles!inner(id, full_name, avatar_url, presence)",
        )
        .eq("session_id", sessionId)
        .order("joined_at");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` },
        () => queryClient.invalidateQueries({ queryKey: ["session-participants", sessionId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  const mine = participants.find((p) => p.user_id === user?.id && !p.left_at);

  async function join(mode: ParticipationMode) {
    if (!user || !session) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("session_participants").insert({
        session_id: session.id,
        group_id: session.group_id,
        user_id: user.id,
        participation_mode: mode,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["session-participants", sessionId] });
      toast.success(`Joined as ${MODE_META[mode].label}`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't join the session."));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!user || !mine || !session) return;
    setBusy(true);
    try {
      const minutes = Math.max(
        1,
        Math.round((Date.now() - new Date(mine.joined_at).getTime()) / 60000),
      );
      const { error } = await supabase
        .from("session_participants")
        .update({ left_at: new Date().toISOString(), total_minutes: minutes })
        .eq("id", mine.id);
      if (error) throw error;
      await awardXp({
        userId: user.id,
        groupId: session.group_id,
        amount: XP_REWARDS.session_complete,
        reason: "session_complete",
      });
      queryClient.invalidateQueries({ queryKey: ["session-participants", sessionId] });
      toast.success(`Session logged: ${minutes} min · +${XP_REWARDS.session_complete} XP`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't leave the session."));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return <p className="text-sm text-muted-foreground">Loading session…</p>;
  }

  const group = session.groups as unknown as { id: string; name: string } | null;
  const state = sessionState(session.start_time, session.end_time);

  return (
    <div className="space-y-6">
      <Link
        to="/schedule"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to schedule
      </Link>

      <header className="surface-card space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
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
          {group && (
            <Link
              to="/groups/$groupId"
              params={{ groupId: group.id }}
              className="text-xs text-primary hover:underline"
            >
              {group.name}
            </Link>
          )}
        </div>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {dayLabel(session.start_time)} · {timeRange(session.start_time, session.end_time)}
          {state === "upcoming" && <span>· starts in {countdown(session.start_time)}</span>}
          {state === "live" && <span>· ends in {countdown(session.end_time)}</span>}
        </p>
        {session.meeting_url && (
          <Button asChild variant="secondary" size="sm">
            <a href={session.meeting_url} target="_blank" rel="noreferrer">
              <Video className="size-4" /> Open meeting link
            </a>
          </Button>
        )}
      </header>

      <section className="surface-card space-y-3 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How are you studying?
        </h2>
        {mine ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {MODE_META[mine.participation_mode as ParticipationMode]?.icon}{" "}
              {MODE_META[mine.participation_mode as ParticipationMode]?.label}
            </Badge>
            <Button size="sm" variant="destructive" onClick={leave} disabled={busy}>
              Leave session
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Button key={m} size="sm" variant="secondary" disabled={busy} onClick={() => join(m)}>
                {MODE_META[m].icon} {MODE_META[m].label}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Participants ({participants.filter((p) => !p.left_at).length} active)
        </h2>
        <div className="surface-card p-4">
          {participants.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nobody has joined yet — be the first.
            </p>
          ) : (
            <ul className="space-y-3">
              {participants.map((p) => {
                const prof = p.profiles as unknown as { full_name: string; avatar_url: string | null };
                const meta = MODE_META[p.participation_mode as ParticipationMode] ?? MODE_META.tuned_in;
                return (
                  <li key={p.id} className="flex items-center gap-3">
                    <UserAvatar
                      name={prof?.full_name}
                      url={prof?.avatar_url}
                      presence={p.left_at ? "offline" : "online"}
                      className="size-8"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{prof?.full_name || "Member"}</p>
                      <p className="text-xs text-muted-foreground">
                        {meta.icon} {meta.label}
                        {p.left_at ? ` · ${p.total_minutes} min` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
