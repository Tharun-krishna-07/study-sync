import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyGroups, friendlyError } from "@/lib/db";
import { SUBJECTS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/groups/")({
  head: () => ({
    meta: [
      { title: "Your groups — StudySync" },
      { name: "description", content: "Create a study group, join with an invite code, and jump into your rooms." },
      { property: "og:title", content: "Your groups — StudySync" },
      { property: "og:description", content: "Create or join study groups on StudySync." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyGroups(user!.id),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your study servers — channels, sessions, roadmap and leaderboard in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <JoinGroupDialog
            onJoined={(id) => {
              queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] });
              navigate({ to: "/groups/$groupId", params: { groupId: id } });
            }}
          />
          <CreateGroupDialog
            onCreated={(id) => {
              queryClient.invalidateQueries({ queryKey: ["my-groups", user?.id] });
              navigate({ to: "/groups/$groupId", params: { groupId: id } });
            }}
          />
        </div>
      </div>

      {isLoading ? null : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You haven't joined a study group yet."
          description="Create one for your friends, or join with an invite code."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="surface-card animate-rise-in block p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-base font-semibold">{g.name}</h2>
                <Badge variant="secondary" className="capitalize">
                  {g.myRole}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-primary">{g.subject}</p>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {g.description || "No description yet."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateGroupDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: SUBJECTS[0] as string,
    description: "",
    image_url: "",
    learning_goal: "",
    start_date: "",
    target_date: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name: form.name.trim(),
          subject: form.subject,
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
          learning_goal: form.learning_goal.trim() || null,
          start_date: form.start_date || null,
          target_date: form.target_date || null,
          owner_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "owner" });
      if (memberError) throw memberError;

      await supabase.from("channels").insert([
        { group_id: group.id, name: "general", type: "text", position: 0, created_by: user.id },
        { group_id: group.id, name: "doubts", type: "text", position: 1, created_by: user.id },
        { group_id: group.id, name: "resources", type: "text", position: 2, created_by: user.id },
        { group_id: group.id, name: "Study Room", type: "voice", position: 3, created_by: user.id },
        { group_id: group.id, name: "Voice Hangout", type: "voice", position: 4, created_by: user.id },
      ]);

      toast.success("Group created — invite your friends!");
      setOpen(false);
      onCreated(group.id);
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't create that group. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Create group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a study group</DialogTitle>
          <DialogDescription>
            You'll get text and voice channels automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">Group name</Label>
            <Input
              id="g-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="DSA Grind Squad"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-subject">Subject</Label>
            <select
              id="g-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Description</Label>
            <Textarea
              id="g-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-goal">Learning goal</Label>
            <Input
              id="g-goal"
              value={form.learning_goal}
              onChange={(e) => setForm({ ...form, learning_goal: e.target.value })}
              placeholder="Finish arrays → graphs by June"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-start">Start date</Label>
              <Input
                id="g-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-target">Target completion</Label>
              <Input
                id="g-target"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-img">Group image URL (optional)</Label>
            <Input
              id="g-img"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinGroupDialog({ onJoined }: { onJoined: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const clean = code.trim().toUpperCase().split("/").pop() ?? "";
      const { data: found, error } = await supabase
        .rpc("noop_placeholder" as never)
        .then(() => ({ data: null, error: null }))
        .catch(() => ({ data: null, error: null }));
      void found;
      void error;

      const { data: group, error: lookupError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", clean)
        .maybeSingle();

      if (lookupError || !group) {
        toast.error("That invite code doesn't match any group.");
        return;
      }

      const { error: joinError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "member" });
      if (joinError && !/duplicate/i.test(joinError.message)) throw joinError;

      toast.success(`Joined ${group.name}!`);
      setOpen(false);
      onJoined(group.id);
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't join that group. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Join with code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Paste the invite code or link a friend shared.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD1234"
            required
          />
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Join group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
