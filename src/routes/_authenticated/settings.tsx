import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { SUBJECTS, PRESENCE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your profile — StudySync" },
      { name: "description", content: "Edit your StudySync name, username, photo and learning interests." },
      { property: "og:title", content: "Your profile — StudySync" },
      { property: "og:description", content: "Edit your profile and learning preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [studyTimes, setStudyTimes] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [presence, setPresence] = useState("online");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setUsername(profile.username ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setBio(profile.bio ?? "");
    setStudyTimes(profile.preferred_study_times ?? "");
    setInterests(profile.learning_interests ?? []);
    setPresence(profile.presence ?? "online");
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        username: username.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        preferred_study_times: studyTimes.trim() || null,
        learning_interests: interests,
        presence,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(
        /duplicate/i.test(error.message)
          ? "That username is already taken."
          : "We couldn't save your profile. Please try again.",
      );
      return;
    }
    await refreshProfile();
    toast.success("Profile updated everywhere.");
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Your profile</h1>

      <div className="surface-card space-y-5 p-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={fullName} url={avatarUrl} presence={presence} className="size-14" />
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="avatar">Profile photo</Label>
            <div className="flex gap-2">
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Paste an image link or upload"
              />
              <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadPhoto(f);
              }}
            />
          </div>
        </div>


        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uname">Username</Label>
            <Input id="uname" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourhandle" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="times">Preferred study times</Label>
          <Input
            id="times"
            value={studyTimes}
            onChange={(e) => setStudyTimes(e.target.value)}
            placeholder="Weeknights 7–10 PM"
          />
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold">Presence</h2>
          <p className="text-xs text-muted-foreground">Shown on your avatar across the app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESENCE_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPresence(key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                presence === key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-secondary-foreground",
              )}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card space-y-4 p-6">
        <h2 className="text-sm font-semibold">Learning interests</h2>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => {
            const active = interests.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() =>
                  setInterests((prev) =>
                    prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
                  )
                }
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary text-secondary-foreground",
                )}
              >
                {subject}
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={busy}>
        Save changes
      </Button>
    </form>
  );
}
