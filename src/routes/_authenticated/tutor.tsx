import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { awardXp, fetchMyGroups, friendlyError } from "@/lib/db";
import { generateAssessment, gradeAssessment } from "@/lib/ai.functions";
import { XP_REWARDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — StudySync" },
      {
        name: "description",
        content: "Tell the AI tutor what you learned and get a personalised assessment with feedback.",
      },
      { property: "og:title", content: "AI Tutor — StudySync" },
      { property: "og:description", content: "Personalised assessments and instant feedback." },
    ],
  }),
  component: TutorPage,
});

type GeneratedQuestion = {
  question: string;
  type: string;
  options: string[];
  topic: string;
  difficulty: string;
  correct_answer: string;
  explanation: string;
};

type SavedQuestion = GeneratedQuestion & { id: string };

type GradeResult = {
  results: Array<{ id: string; is_correct: boolean; note: string }>;
  score: number;
  per_topic: Array<{ topic: string; score: number }>;
  feedback: {
    understand_well: string[];
    needs_improvement: string[];
    recommended_practice: string[];
  };
  next_difficulty: string;
};

function TutorPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [learningInput, setLearningInput] = useState("");
  const [groupId, setGroupId] = useState<string>("none");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [busy, setBusy] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["my-groups", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyGroups(user!.id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["my-assessments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, topics, score, status, created_at, difficulty")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function start() {
    if (!user || learningInput.trim().length < 3) {
      toast.error("Tell the tutor what you studied first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const group = groups.find((g) => g.id === groupId);
      const generated = await generateAssessment({
        data: {
          learningInput: learningInput.trim(),
          subject: group?.subject ?? "programming",
          roadmapTopics: [],
          difficulty,
          weakTopics: [],
          strongTopics: [],
          mixedChallenge: false,
        },
      });

      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          user_id: user.id,
          group_id: group?.id ?? null,
          topics: generated.topics,
          learning_input: learningInput.trim(),
          difficulty,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error) throw error;

      const rows = generated.questions.map((q, i) => ({
        assessment_id: assessment.id,
        position: i,
        question: q.question,
        type: q.type,
        options: q.options,
        topic: q.topic,
        difficulty: q.difficulty,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));
      const { data: saved, error: qErr } = await supabase
        .from("questions")
        .insert(rows)
        .select("*")
        .order("position");
      if (qErr) throw qErr;

      setAssessmentId(assessment.id);
      setQuestions((saved ?? []) as unknown as SavedQuestion[]);
      setAnswers({});
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't build your assessment."));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!user || !assessmentId) return;
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast.error(`${unanswered.length} question(s) still need an answer.`);
      return;
    }
    setBusy(true);
    try {
      const graded = (await gradeAssessment({
        data: {
          items: questions.map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            topic: q.topic,
            correct_answer: q.correct_answer,
            answer: answers[q.id] ?? "",
          })),
        },
      })) as GradeResult;

      await supabase.from("answers").insert(
        questions.map((q) => ({
          question_id: q.id,
          user_id: user.id,
          answer: answers[q.id] ?? "",
          is_correct: graded.results.find((r) => r.id === q.id)?.is_correct ?? false,
        })),
      );

      await supabase
        .from("assessments")
        .update({
          score: graded.score,
          feedback: graded.feedback as never,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", assessmentId);

      const bonus = graded.score >= 85 ? XP_REWARDS.assessment_excellent_bonus : 0;
      await awardXp({
        userId: user.id,
        groupId: groupId === "none" ? null : groupId,
        amount: XP_REWARDS.assessment_complete + bonus,
        reason: "assessment_complete",
      });

      setResult(graded);
      queryClient.invalidateQueries({ queryKey: ["my-assessments", user.id] });
      toast.success(`Scored ${Math.round(graded.score)}% · +${XP_REWARDS.assessment_complete + bonus} XP`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't grade your answers."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setAssessmentId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setLearningInput("");
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-5 text-primary" /> AI Tutor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell the tutor what you learned today — it builds an assessment just for you.
        </p>
      </header>

      {questions.length === 0 ? (
        <section className="surface-card space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="learned">What did you learn?</Label>
            <Textarea
              id="learned"
              rows={4}
              placeholder="e.g. Pointers in C, arrays of pointers, and passing pointers to functions"
              value={learningInput}
              onChange={(e) => setLearningInput(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Group context</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} · {g.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={start} disabled={busy}>
            {busy ? "Building your assessment…" : "Start assessment"}
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          {questions.map((q, i) => {
            const res = result?.results.find((r) => r.id === q.id);
            return (
              <div key={q.id} className="surface-card space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Q{i + 1}</Badge>
                  <Badge variant="outline" className="capitalize">
                    {q.type.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline">{q.topic}</Badge>
                  {res && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        res.is_correct ? "text-status-active" : "text-destructive",
                      )}
                    >
                      {res.is_correct ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                      {res.is_correct ? "Correct" : "Needs work"}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium">{q.question}</p>

                {q.options.length > 0 ? (
                  <div className="grid gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!result}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className={cn(
                          "rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors",
                          answers[q.id] === opt
                            ? "border-primary bg-primary/10"
                            : "hover:border-primary/40",
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    rows={3}
                    disabled={!!result}
                    placeholder="Your answer"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                )}

                {result && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Model answer: {q.correct_answer}</p>
                    <p className="mt-1">{res?.note || q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}

          {!result ? (
            <Button onClick={submit} disabled={busy}>
              {busy ? "Grading…" : "Submit answers"}
            </Button>
          ) : (
            <div className="surface-card space-y-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">Your score</p>
                <p className="text-3xl font-bold text-gradient">{Math.round(result.score)}%</p>
                <Progress value={result.score} className="mt-3" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FeedbackList title="You understand well" items={result.feedback.understand_well} />
                <FeedbackList title="Needs improvement" items={result.feedback.needs_improvement} />
                <FeedbackList
                  title="Recommended practice"
                  items={result.feedback.recommended_practice}
                />
              </div>
              {result.per_topic.length > 0 && (
                <div className="space-y-2">
                  {result.per_topic.map((t) => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="w-40 truncate text-xs text-muted-foreground">{t.topic}</span>
                      <Progress value={t.score} className="h-2 flex-1" />
                      <span className="text-xs">{Math.round(t.score)}%</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="secondary" onClick={reset}>
                New assessment
              </Button>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && questions.length === 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent assessments
          </h2>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="surface-card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {(h.topics as string[]).join(", ") || "Assessment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString()} · {h.difficulty}
                  </p>
                </div>
                <Badge variant="outline">
                  {h.score != null ? `${Math.round(Number(h.score))}%` : h.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length === 0 ? (
          <li className="text-muted-foreground">—</li>
        ) : (
          items.map((i) => <li key={i}>· {i}</li>)
        )}
      </ul>
    </div>
  );
}

