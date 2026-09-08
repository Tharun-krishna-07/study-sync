import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Hash, Pin, Plus, Reply, Send, Sparkles, Volume2 } from "lucide-react";

const REACTIONS = ["👍", "🔥", "🎯", "😄"] as const;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { GroupInsights } from "@/components/group-insights";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { awardXp, fetchGroupMembers, friendlyError, type ProfileLite } from "@/lib/db";
import { explainDoubt } from "@/lib/ai.functions";
import { dayLabel, sessionState, timeRange } from "@/lib/format";
import { XP_REWARDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({
    meta: [
      { title: "Group workspace — StudySync" },
      {
        name: "description",
        content: "Channels, members, roadmap, resources, sessions and doubts for your study group.",
      },
      { property: "og:title", content: "Group workspace — StudySync" },
      { property: "og:description", content: "Everything your study group needs in one place." },
    ],
  }),
  component: GroupWorkspace,
});

function GroupWorkspace() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => fetchGroupMembers(groupId),
  });

  const myRole = members.find((m) => m.user_id === user?.id)?.role ?? "member";
  const isAdmin = myRole === "owner" || myRole === "admin";

  if (!group) return <p className="text-sm text-muted-foreground">Loading group…</p>;

  return (
    <div className="space-y-6">
      <Link
        to="/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All groups
      </Link>

      <header className="surface-card space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-xs text-primary">{group.subject}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(group.invite_code);
              toast.success("Invite code copied");
            }}
          >
            <Copy className="size-4" /> {group.invite_code}
          </Button>
        </div>
        {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
        {group.learning_goal && (
          <p className="text-sm">
            <span className="text-muted-foreground">Goal:</span> {group.learning_goal}
          </p>
        )}
      </header>

      <Tabs defaultValue="chat">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="doubts">Doubts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatTab groupId={groupId} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab groupId={groupId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="roadmap" className="mt-4">
          <RoadmapTab groupId={groupId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
          <ResourcesTab groupId={groupId} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab groupId={groupId} />
        </TabsContent>
        <TabsContent value="doubts" className="mt-4">
          <DoubtsTab groupId={groupId} subject={group.subject} />
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <GroupInsights groupId={groupId} groupName={group.name} subject={group.subject} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Chat ---------------- */

function ChatTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [channelId, setChannelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("group_id", groupId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type !== "text");
  const activeId = channelId ?? textChannels[0]?.id ?? null;

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, user_id, is_system, pinned, reply_to, created_at, profiles:profiles(id, full_name, avatar_url), message_reactions(id, emoji, user_id)",
        )
        .eq("channel_id", activeId!)
        .order("created_at")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!activeId) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${activeId}` },
        invalidate,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, invalidate)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const byId = new Map(messages.map((m) => [m.id, m]));
  const pinned = messages.filter((m) => m.pinned);

  async function send() {
    if (!user || !activeId || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    const parent = replyTo;
    setReplyTo(null);
    const { error } = await supabase.from("messages").insert({
      group_id: groupId,
      channel_id: activeId,
      user_id: user.id,
      content,
      reply_to: parent,
    });
    if (error) toast.error(friendlyError(error, "Message didn't send."));
  }

  async function toggleReaction(messageId: string, emoji: string, mine: string | undefined) {
    if (!user) return;
    const { error } = mine
      ? await supabase.from("message_reactions").delete().eq("id", mine)
      : await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, group_id: groupId, user_id: user.id, emoji });
    if (error) toast.error(friendlyError(error, "That reaction didn't save."));
    else queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
  }

  async function togglePin(messageId: string, next: boolean) {
    const { error } = await supabase.from("messages").update({ pinned: next }).eq("id", messageId);
    if (error) toast.error(friendlyError(error, "Only the author or a group admin can pin messages."));
    else queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <aside className="surface-card h-fit p-3">
        <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">Text</p>
        <div className="mt-1 space-y-0.5">
          {textChannels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannelId(c.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                c.id === activeId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <Hash className="size-3.5" /> {c.name}
            </button>
          ))}
        </div>
        {voiceChannels.length > 0 && (
          <>
            <p className="mt-3 px-2 text-xs font-semibold uppercase text-muted-foreground">Voice</p>
            <div className="mt-1 space-y-0.5">
              {voiceChannels.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
                >
                  <Volume2 className="size-3.5" /> {c.name}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      <div className="surface-card flex h-[560px] flex-col p-4">
        {pinned.length > 0 && (
          <div className="mb-3 rounded-lg border border-border/60 bg-accent/30 p-2">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
              <Pin className="size-3" /> Pinned
            </p>
            <div className="space-y-1">
              {pinned.map((m) => (
                <p key={m.id} className="truncate text-xs text-muted-foreground">
                  {m.content}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </p>
          ) : (
            messages.map((m) => {
              const prof = m.profiles as unknown as { full_name: string; avatar_url: string | null } | null;
              if (m.is_system) {
                return (
                  <p key={m.id} className="text-center text-xs italic text-muted-foreground">
                    {m.content}
                  </p>
                );
              }
              const reactions = (m.message_reactions ?? []) as { id: string; emoji: string; user_id: string }[];
              const grouped = new Map<string, { count: number; mine?: string }>();
              for (const r of reactions) {
                const entry = grouped.get(r.emoji) ?? { count: 0 };
                entry.count += 1;
                if (r.user_id === user?.id) entry.mine = r.id;
                grouped.set(r.emoji, entry);
              }
              const parent = m.reply_to ? byId.get(m.reply_to) : undefined;
              return (
                <div key={m.id} className="group flex gap-3">
                  <UserAvatar name={prof?.full_name} url={prof?.avatar_url} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {prof?.full_name || "Member"} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {m.pinned && <span className="ml-2 text-primary">pinned</span>}
                    </p>
                    {parent && (
                      <p className="mt-0.5 truncate border-l-2 border-border pl-2 text-xs text-muted-foreground">
                        replying to: {parent.content}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {[...grouped.entries()].map(([emoji, info]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => void toggleReaction(m.id, emoji, info.mine)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            info.mine ? "border-primary/60 bg-primary/10" : "border-border/60",
                          )}
                        >
                          {emoji} {info.count}
                        </button>
                      ))}
                      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            aria-label={`React ${emoji}`}
                            onClick={() => void toggleReaction(m.id, emoji, grouped.get(emoji)?.mine)}
                            className="rounded-full px-1 text-xs hover:bg-accent"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          aria-label="Reply"
                          onClick={() => setReplyTo(m.id)}
                          className="rounded-full p-1 hover:bg-accent"
                        >
                          <Reply className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={m.pinned ? "Unpin" : "Pin"}
                          onClick={() => void togglePin(m.id, !m.pinned)}
                          className="rounded-full p-1 hover:bg-accent"
                        >
                          <Pin className="size-3.5" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        {replyTo && (
          <div className="mt-2 flex items-center justify-between rounded-md bg-accent/40 px-3 py-1.5 text-xs">
            <span className="truncate text-muted-foreground">
              Replying to: {byId.get(replyTo)?.content ?? "message"}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the group"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>

      </div>
    </div>
  );
}

/* ---------------- Members ---------------- */

function MembersTab({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => fetchGroupMembers(groupId),
  });

  async function setRole(id: string, role: string) {
    const { error } = await supabase.from("group_members").update({ role }).eq("id", id);
    if (error) { toast.error(friendlyError(error, "Couldn't update the role.")); return; }
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    toast.success("Role updated");
  }

  return (
    <ul className="space-y-2">
      {members.map((m) => {
        const prof = m.profiles as ProfileLite | null | undefined;
        return (
          <li key={m.id} className="surface-card flex items-center gap-3 p-4">
            <UserAvatar
              name={prof?.full_name}
              url={prof?.avatar_url}
              presence={prof?.presence ?? "offline"}
              className="size-9"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{prof?.full_name || "Member"}</p>
              <p className="text-xs text-muted-foreground">{prof?.total_xp ?? 0} XP</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {m.role}
            </Badge>
            {isAdmin && m.role !== "owner" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRole(m.id, m.role === "admin" ? "member" : "admin")}
              >
                {m.role === "admin" ? "Demote" : "Make admin"}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Roadmap ---------------- */

function RoadmapTab({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const { data: topics = [] } = useQuery({
    queryKey: ["topics", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("group_id", groupId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addTopic() {
    if (!title.trim()) return;
    const { error } = await supabase.from("topics").insert({
      group_id: groupId,
      title: title.trim(),
      description: description.trim() || null,
      position: topics.length,
      status: "not_started",
    });
    if (error) { toast.error(friendlyError(error, "Couldn't add the topic.")); return; }
    setTitle("");
    setDescription("");
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["topics", groupId] });
  }

  async function cycleStatus(id: string, status: string) {
    const next =
      status === "not_started" ? "in_progress" : status === "in_progress" ? "completed" : "not_started";
    const { error } = await supabase.from("topics").update({ status: next }).eq("id", id);
    if (error) { toast.error(friendlyError(error, "Couldn't update the topic.")); return; }
    queryClient.invalidateQueries({ queryKey: ["topics", groupId] });
  }

  const done = topics.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {done} of {topics.length} topics completed
        </p>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Add topic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a roadmap topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="topic-title">Title</Label>
                  <Input id="topic-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topic-desc">Description</Label>
                  <Textarea
                    id="topic-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTopic}>Add topic</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {topics.length === 0 ? (
        <EmptyState title="No roadmap yet." description="Admins can add the topics your group plans to cover." />
      ) : (
        <ol className="space-y-2">
          {topics.map((t, i) => (
            <li key={t.id} className="surface-card flex items-center gap-3 p-4">
              <span className="text-xs text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="capitalize"
                onClick={() => cycleStatus(t.id, t.status)}
              >
                {t.status.replace("_", " ")}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------------- Resources ---------------- */

function ResourcesTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", resource_type: "link", notes: "" });

  const { data: resources = [] } = useQuery({
    queryKey: ["resources", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["resource-completions", groupId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_completions")
        .select("resource_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const doneIds = new Set(completions.map((c) => c.resource_id));

  async function addResource() {
    if (!user || !form.title.trim() || !form.url.trim()) {
      toast.error("A title and link are required.");
      return;
    }
    const { error } = await supabase.from("resources").insert({
      group_id: groupId,
      title: form.title.trim(),
      url: form.url.trim(),
      resource_type: form.resource_type,
      notes: form.notes.trim() || null,
      added_by: user.id,
    });
    if (error) { toast.error(friendlyError(error, "Couldn't save the resource.")); return; }
    setForm({ title: "", url: "", resource_type: "link", notes: "" });
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["resources", groupId] });
  }

  async function toggleDone(resourceId: string) {
    if (!user) return;
    if (doneIds.has(resourceId)) {
      await supabase
        .from("resource_completions")
        .delete()
        .eq("resource_id", resourceId)
        .eq("user_id", user.id);
    } else {
      await supabase.from("resource_completions").insert({ resource_id: resourceId, user_id: user.id });
    }
    queryClient.invalidateQueries({ queryKey: ["resource-completions", groupId, user.id] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share a resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-title">Title</Label>
                <Input
                  id="r-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-url">Link</Label>
                <Input
                  id="r-url"
                  placeholder="https://"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-notes">Notes</Label>
                <Textarea
                  id="r-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addResource}>Add resource</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {resources.length === 0 ? (
        <EmptyState title="No resources yet." description="Share the videos and articles your group is using." />
      ) : (
        <ul className="space-y-2">
          {resources.map((r) => (
            <li key={r.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium hover:text-primary"
                >
                  {r.title}
                </a>
                {r.notes && <p className="truncate text-xs text-muted-foreground">{r.notes}</p>}
              </div>
              <Button
                size="sm"
                variant={doneIds.has(r.id) ? "secondary" : "outline"}
                onClick={() => toggleDone(r.id)}
              >
                {doneIds.has(r.id) ? "Completed" : "Mark complete"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Sessions ---------------- */

function SessionsTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    meeting_url: "",
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["group-sessions", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("group_id", groupId)
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createSession() {
    if (!user || !form.title.trim() || !form.start_time || !form.end_time) {
      toast.error("Title, start and end time are required.");
      return;
    }
    const { error } = await supabase.from("study_sessions").insert({
      group_id: groupId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      meeting_url: form.meeting_url.trim() || null,
      status: "scheduled",
      recurrence: "none",
      recurrence_days: [],
      created_by: user.id,
    });
    if (error) { toast.error(friendlyError(error, "Couldn't schedule the session.")); return; }
    setForm({ title: "", description: "", start_time: "", end_time: "", meeting_url: "" });
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["group-sessions", groupId] });
    toast.success("Session scheduled");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Schedule session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a study session</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-title">Title</Label>
                <Input
                  id="s-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-start">Starts</Label>
                  <Input
                    id="s-start"
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-end">Ends</Label>
                  <Input
                    id="s-end"
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-url">Meeting link (optional)</Label>
                <Input
                  id="s-url"
                  value={form.meeting_url}
                  onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-desc">What will you cover?</Label>
                <Textarea
                  id="s-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createSession}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No sessions scheduled." description="Plan your group's next study block." />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const state = sessionState(s.start_time, s.end_time);
            return (
              <li key={s.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
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
                    Open
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Doubts ---------------- */

function DoubtsTab({ groupId, subject }: { groupId: string; subject: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: doubts = [] } = useQuery({
    queryKey: ["doubts", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doubts")
        .select("*, profiles:profiles(id, full_name, avatar_url)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function ask() {
    if (!user || question.trim().length < 3) {
      toast.error("Write your question first.");
      return;
    }
    setBusy(true);
    try {
      const { data: doubt, error } = await supabase
        .from("doubts")
        .insert({ group_id: groupId, user_id: user.id, question: question.trim(), status: "open" })
        .select("id")
        .single();
      if (error) throw error;

      const { explanation } = await explainDoubt({
        data: { question: question.trim(), subject },
      });
      await supabase
        .from("doubts")
        .update({ ai_explanation: explanation, status: "answered" })
        .eq("id", doubt.id);

      await awardXp({
        userId: user.id,
        groupId,
        amount: XP_REWARDS.doubt_resolved,
        reason: "doubt_resolved",
      });

      setQuestion("");
      queryClient.invalidateQueries({ queryKey: ["doubts", groupId] });
    } catch (err) {
      toast.error(friendlyError(err, "The tutor couldn't answer that right now."));
      queryClient.invalidateQueries({ queryKey: ["doubts", groupId] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface-card space-y-3 p-5">
        <Label htmlFor="doubt">Ask a doubt</Label>
        <Textarea
          id="doubt"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Why does a pointer to a local variable become invalid after the function returns?"
        />
        <Button onClick={ask} disabled={busy}>
          <Sparkles className="size-4" /> {busy ? "Thinking…" : "Ask the AI tutor"}
        </Button>
      </div>

      {doubts.length === 0 ? (
        <EmptyState title="No doubts yet." description="Ask anything — your group and the AI tutor can help." />
      ) : (
        <ul className="space-y-3">
          {doubts.map((d) => {
            const prof = d.profiles as unknown as { full_name: string; avatar_url: string | null } | null;
            return (
              <li key={d.id} className="surface-card space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <UserAvatar name={prof?.full_name} url={prof?.avatar_url} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{prof?.full_name || "Member"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {d.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{d.question}</p>
                {d.ai_explanation && (
                  <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                    <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-primary">
                      <Sparkles className="size-3" /> AI tutor
                    </p>
                    <p className="whitespace-pre-wrap">{d.ai_explanation}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
