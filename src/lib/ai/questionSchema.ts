/**
 * Shared schema validation and metadata formatting for AI-generated interview questions.
 *
 * Used by:
 *   - api/ai/generate-questions/route.ts  (session question generation)
 *   - api/questions/augment/route.ts      (library question augmentation)
 *
 * Keeps both pipelines consistent: validate → normalise → format.
 */

import type { GeneratedQuestion, GeneratedSnippet, Difficulty } from "@/types/app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionMetadata {
  explanation: string | null;
  simpleExplanation: string | null;
  highlights: string[] | null;
  codeExamples: { language: string; code: string }[] | null;
}

export interface AugmentedFields {
  detailed_explanation: string;
  simple_explanation: string;
  examples: string[];
  code_examples: { language: string; code: string }[];
  highlights: string[];
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/** Validates a raw AI-parsed question object and returns null if invalid. */
export function validateGeneratedQuestion(raw: unknown): GeneratedQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;

  if (typeof q.question !== "string" || !q.question.trim()) return null;
  if (typeof q.answer !== "string" || !q.answer.trim()) return null;

  return {
    question: q.question.trim(),
    answer: q.answer.trim(),
    topic: typeof q.topic === "string" ? q.topic : undefined,
    tags: Array.isArray(q.tags) ? (q.tags as string[]).filter((t) => typeof t === "string") : [],
    difficulty: validateDifficulty(q.difficulty),
    explanation: typeof q.explanation === "string" ? q.explanation : undefined,
    simpleExplanation: typeof q.simpleExplanation === "string" ? q.simpleExplanation : undefined,
    highlights: Array.isArray(q.highlights) ? (q.highlights as string[]).filter((h) => typeof h === "string") : undefined,
    codeExamples: validateCodeExamples(q.codeExamples),
  };
}

/** Validates a raw AI-parsed snippet object and returns null if invalid. */
export function validateGeneratedSnippet(raw: unknown): GeneratedSnippet | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;

  if (typeof s.title !== "string" || !s.title.trim()) return null;
  if (typeof s.code !== "string" || !s.code.trim()) return null;

  return {
    title: s.title.trim(),
    description: typeof s.description === "string" ? s.description : undefined,
    language: typeof s.language === "string" ? s.language : "javascript",
    code: s.code,
    explanation: typeof s.explanation === "string" ? s.explanation : undefined,
    tags: Array.isArray(s.tags) ? (s.tags as string[]).filter((t) => typeof t === "string") : [],
    difficulty: validateDifficulty(s.difficulty),
    solution: typeof s.solution === "string" ? s.solution : undefined,
    solutionExplanation: typeof s.solutionExplanation === "string" ? s.solutionExplanation : undefined,
  };
}

/** Validates augment response fields; fills missing fields with empty defaults. */
export function validateAugmentedFields(raw: unknown): AugmentedFields {
  if (!raw || typeof raw !== "object") {
    return emptyAugmentedFields();
  }
  const r = raw as Record<string, unknown>;
  return {
    detailed_explanation: typeof r.detailed_explanation === "string" ? r.detailed_explanation : "",
    simple_explanation: typeof r.simple_explanation === "string" ? r.simple_explanation : "",
    examples: Array.isArray(r.examples) ? (r.examples as string[]).filter((e) => typeof e === "string") : [],
    code_examples: validateCodeExamples(r.code_examples) ?? [],
    highlights: Array.isArray(r.highlights) ? (r.highlights as string[]).filter((h) => typeof h === "string") : [],
  };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Builds the `metadata` JSONB object stored in `session_questions`.
 * Single source of truth for the 4-section formatting pipeline.
 */
export function formatQuestionMetadata(q: GeneratedQuestion): QuestionMetadata {
  return {
    explanation: q.explanation ?? q.topicExplanation ?? null,
    simpleExplanation: q.simpleExplanation ?? q.analogy ?? null,
    highlights: q.highlights && q.highlights.length > 0 ? q.highlights : null,
    codeExamples: q.codeExamples && q.codeExamples.length > 0 ? q.codeExamples : null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateDifficulty(value: unknown): Difficulty {
  if (value === "junior" || value === "mid" || value === "senior") return value;
  return "mid";
}

function validateCodeExamples(value: unknown): { language: string; code: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const valid = (value as unknown[]).filter(
    (ex): ex is { language: string; code: string } =>
      typeof ex === "object" && ex !== null && typeof (ex as Record<string, unknown>).language === "string" && typeof (ex as Record<string, unknown>).code === "string",
  );
  return valid.length > 0 ? valid : undefined;
}

function emptyAugmentedFields(): AugmentedFields {
  return { detailed_explanation: "", simple_explanation: "", examples: [], code_examples: [], highlights: [] };
}
