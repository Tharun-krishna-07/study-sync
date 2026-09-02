import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

async function chat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (res.status === 429) throw new Error("The AI tutor is busy right now. Please try again shortly.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  if (!res.ok) throw new Error("The AI tutor is unavailable right now.");

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI tutor returned an unexpected response.");
  return JSON.parse(raw.slice(start, end + 1));
}

const questionSchema = z.object({
  question: z.string(),
  type: z.enum(["mcq", "true_false", "short_answer", "output", "debugging", "coding", "explain"]),
  options: z.array(z.string()).default([]),
  topic: z.string().default("General"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  correct_answer: z.string(),
  explanation: z.string().default(""),
});

export const generateAssessment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        learningInput: z.string().min(3),
        subject: z.string().default("programming"),
        roadmapTopics: z.array(z.string()).default([]),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        weakTopics: z.array(z.string()).default([]),
        strongTopics: z.array(z.string()).default([]),
        mixedChallenge: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const prompt = `You are an exacting programming tutor building a personalised assessment.

Subject: ${data.subject}
Student says they learned: """${data.learningInput}"""
Group roadmap topics: ${data.roadmapTopics.join(", ") || "none provided"}
Known weak areas: ${data.weakTopics.join(", ") || "none yet"}
Known strong areas: ${data.strongTopics.join(", ") || "none yet"}
Target difficulty: ${data.difficulty}
${data.mixedChallenge ? "Include 2 mixed-concept questions that combine several of these topics to test real application." : ""}

Write 6 questions mixing types: mcq, true_false, short_answer, output (predict output), debugging, coding or explain.
For mcq include 4 options and set correct_answer to the exact option text. For true_false, options are ["True","False"].
For short_answer/output/coding/explain, correct_answer is a concise model answer.

Respond with STRICT JSON only:
{"topics":["..."],"questions":[{"question":"","type":"mcq","options":[],"topic":"","difficulty":"easy|medium|hard","correct_answer":"","explanation":""}]}`;

    const text = await chat([{ role: "user", content: prompt }]);
    const parsed = z
      .object({ topics: z.array(z.string()).default([]), questions: z.array(questionSchema).min(1) })
      .parse(extractJson(text));
    return parsed;
  });

export const gradeAssessment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              id: z.string(),
              question: z.string(),
              type: z.string(),
              topic: z.string(),
              correct_answer: z.string(),
              answer: z.string(),
            }),
          )
          .min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const prompt = `Grade this student's assessment fairly. Accept answers that are semantically correct even if worded differently.

${JSON.stringify(data.items, null, 2)}

Respond with STRICT JSON only:
{"results":[{"id":"","is_correct":true,"note":"one short sentence"}],
 "score":0,
 "per_topic":[{"topic":"","score":0}],
 "feedback":{"understand_well":["..."],"needs_improvement":["..."],"recommended_practice":["..."]},
 "next_difficulty":"easy|medium|hard"}
"score" is the overall percentage 0-100.`;

    const text = await chat([{ role: "user", content: prompt }]);
    return z
      .object({
        results: z.array(z.object({ id: z.string(), is_correct: z.boolean(), note: z.string().default("") })),
        score: z.number(),
        per_topic: z.array(z.object({ topic: z.string(), score: z.number() })).default([]),
        feedback: z.object({
          understand_well: z.array(z.string()).default([]),
          needs_improvement: z.array(z.string()).default([]),
          recommended_practice: z.array(z.string()).default([]),
        }),
        next_difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      })
      .parse(extractJson(text));
  });

export const explainDoubt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ question: z.string().min(3), subject: z.string().default("programming") }).parse(data),
  )
  .handler(async ({ data }) => {
    const text = await chat([
      {
        role: "user",
        content: `A student studying ${data.subject} asked: "${data.question}"

Explain clearly in under 180 words. Use a short code example if it helps. Plain text, no markdown headers.`,
      },
    ]);
    return { explanation: text.trim() };
  });

export const generateWeeklyReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        groupName: z.string(),
        subject: z.string(),
        stats: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const text = await chat([
      {
        role: "user",
        content: `Write a weekly study-group report for "${data.groupName}" (${data.subject}).

Raw stats:
${data.stats}

Respond with STRICT JSON only:
{"narrative":"2-3 sentence insight about the group's performance","recommendation":"next week's topic recommendation in one sentence"}`,
      },
    ]);
    return z
      .object({ narrative: z.string(), recommendation: z.string() })
      .parse(extractJson(text));
  });
