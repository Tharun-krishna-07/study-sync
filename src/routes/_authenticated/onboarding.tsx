import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "What do you want to learn? — StudySync" },
      { name: "description", content: "Pick the subjects you want to learn on StudySync." },
      { property: "og:title", content: "What do you want to learn? — StudySync" },
      { property: "og:description", content: "Pick the subjects you want to learn on StudySync." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(subject: string) {
    setPicked((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    );
  }

  async function save(interests: string[]) {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ learning_interests: interests, onboarded: true })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("We couldn't save your interests. Please try again.");
      return;
    }
    await refreshProfile();
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">What do you want to learn?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick as many as you like — we use this to tailor your roadmap and AI assessments.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {SUBJECTS.map((subject) => {
          const active = picked.includes(subject);
          return (
            <button
              key={subject}
              type="button"
              onClick={() => toggle(subject)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
              )}
            >
              {subject}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button disabled={busy || picked.length === 0} onClick={() => save(picked)}>
          Continue
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => save([])}>
          I'll decide later
        </Button>
      </div>
    </div>
  );
}
