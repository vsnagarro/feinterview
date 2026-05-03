export type Difficulty = "junior" | "mid" | "senior";
export type QuestionSource = "manual" | "ai_generated";
export type SessionStatus = "pending" | "active" | "submitted" | "completed" | "expired";
export type WorkspaceTemplate = "vanilla" | "react" | "tailwind";
export type GenerateType = "both" | "questions" | "challenges";

export interface InterviewProfile {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  position: string;
  level: string;
  jd_text: string | null;
  question_count: number;
  challenge_count: number;
  trickiness: number;
  difficulty: Difficulty;
  generate_type: GenerateType;
  challenge_guideline: string | null;
  extra_checks: string | null;
  notes: string | null;
}

export const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python", "css", "html", "java", "go", "rust", "sql"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  css: "CSS",
  html: "HTML",
  java: "Java",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
};

export const WORKSPACE_TEMPLATE_LABELS: Record<WorkspaceTemplate, string> = {
  vanilla: "Vanilla HTML/CSS/JS",
  react: "React",
  tailwind: "Tailwind Playground",
};

export interface GeneratedQuestion {
  question: string;
  answer: string; // concise answer for candidate view
  explanation?: string; // short explanation
  topic?: string;
  tags: string[];
  difficulty: Difficulty;
  // Rich answer components for admin visibility
  topicExplanation?: string; // simple explanation of the topic
  highlights?: string[]; // bullet points
  analogy?: string; // analogous example
  codeExamples?: { language: string; code: string }[];
}

export interface GeneratedSnippet {
  title: string;
  description?: string;
  language: string;
  code: string;
  explanation?: string;
  tags: string[];
  difficulty: Difficulty;
  // Admin-only solution content
  solution?: string;
  solutionExplanation?: string;
}

export interface GenerateQuestionsPayload {
  sessionId: string;
  candidateName: string;
  skills: string[];
  yearsExp: number;
  jobDescription: string;
  difficulty: Difficulty;
  count?: number;
  challengeCount?: number;
  extraChecks?: string;
  targetLevel?: string;
  trickiness?: number | null;
  resumeUrl?: string;
}

export interface AnalyzeCodePayload {
  linkId: string;
  code: string;
  language: string;
  problemStatement: string;
}

export interface CodeAnalysis {
  summary: string;
  strengths: string[];
  issues: string[];
  followUpQuestions: string[];
}

export interface ChallengeLink {
  id: string;
  token: string;
  expiresAt: string;
  isActive: boolean;
  candidateName?: string;
  openedAt?: string;
}
