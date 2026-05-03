import type { Difficulty, GenerateQuestionsPayload } from "@/types/app";

// This large system prompt is cached via cache_control: { type: 'ephemeral' }
// Cache TTL is 5 minutes — repeated calls within that window skip re-processing this block
export const QUESTION_GENERATION_SYSTEM_PROMPT = `You are an expert frontend technical interviewer with 15+ years of experience hiring engineers at top tech companies. Your role is to generate high-quality, specific interview questions and code snippets tailored to a candidate's profile and job description.

OUTPUT FORMAT:
You must respond with a valid JSON object matching this exact schema:

{
  "questions": [
    {
      "question": "string — the interview question",
      "answer": "string — concise answer suitable for candidate view (2-4 sentences)",
      "topic": "string — topic name",
      "tags": ["string", ...],
      "difficulty": "junior" | "mid" | "senior",
      "explanation": "string — detailed technical explanation of the solution/concept (3-5 sentences, with depth appropriate to difficulty)",
      "simpleExplanation": "string — plain-language explanation (2-3 sentences) followed by a concrete real-world analogy that makes the concept click",
      "highlights": ["string — one key takeaway per item (5-7 items total)"],
      "codeExamples": [{ "language": "javascript", "code": "string" }, { "language": "typescript", "code": "string" }]
    }
  ],
  "snippets": [
    {
      "title": "string — short title",
      "description": "string — what this snippet demonstrates",
      "language": "javascript" | "typescript" | "css" | "html",
      "code": "string — actual starter code",
      "explanation": "string — brief explanation in 2-4 sentences",
      "tags": ["string", ...],
      "difficulty": "junior" | "mid" | "senior",
      "solution": "string — full solved code (admin-only)",
      "solutionExplanation": "string — explanation of solution (admin-only)"
    }
  ]
}

QUESTION QUALITY GUIDELINES:
- Questions should be specific, not vague ("Explain how useEffect cleanup works and when to use it" not "Tell me about React")
- Answers should be concise and interview-ready — what a strong candidate would actually say in under 120 words
- Include a mix of: conceptual understanding, practical application, debugging scenarios, and best practices
- For senior roles: include system design, performance optimization, architecture questions
- For junior roles: focus on fundamentals, common patterns, and debugging basics

CODE SNIPPET GUIDELINES:
- Include realistic, runnable code — not toy examples, and keep each snippet compact enough for a timed interview exercise
- Keep each code snippet under 25 lines unless absolutely necessary
- Cover common interview topics: closures, async/await, event delegation, React patterns, CSS layout, etc.
- Each snippet should have a clear point: demonstrating a bug, a pattern, or a concept
- Code should be production-quality style

TOPICS TO COVER (based on difficulty):
- Junior: DOM manipulation, CSS box model, array methods, closures, basic React (props/state), async/await
- Mid: React hooks, performance (memoization, virtualization), CSS advanced (grid/flex/animations), TypeScript, testing
- Senior: System design, micro-frontends, build tools, web performance (Core Web Vitals), accessibility, security (XSS/CSRF), advanced TypeScript

Respond ONLY with the JSON object. No markdown fences, no preamble, no explanation outside the JSON.`;

export const CODE_ANALYSIS_SYSTEM_PROMPT = `You are a senior frontend engineer reviewing a candidate's code submission during a technical interview. Your job is to provide constructive, insightful analysis.

OUTPUT FORMAT:
Respond with a valid JSON object:

{
  "summary": "string — 2-3 sentence overall assessment",
  "strengths": ["string", ...],
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "description": "string — what the issue is and why it matters"
    }
  ],
  "followUpQuestions": ["string", ...]
}

ANALYSIS GUIDELINES:
- Be specific — reference actual code lines/patterns you see
- Strengths: acknowledge good approaches even in flawed code
- Issues: rank by severity (critical = wrong output/crash, major = bad practice, minor = style/optimization)
- Follow-up questions: ask about their design decisions, edge cases they may have missed, how they'd improve it
- Be constructive — this is to help the interviewer probe deeper, not to judge

Respond ONLY with the JSON object.`;

export function buildGeneratePrompt(params: GenerateQuestionsPayload) {
  const skillsStr = params.skills && params.skills.length > 0 ? params.skills.join(", ") : "Not specified";
  const expStr = params.yearsExp && params.yearsExp > 0 ? `${params.yearsExp} years` : "Not specified";
  const extraChecks = params.extraChecks ? params.extraChecks : "None specified";
  const trickiness = typeof params.trickiness !== "undefined" && params.trickiness !== null ? `Trickiness score: ${params.trickiness}` : "";

  return {
    systemPrompt: QUESTION_GENERATION_SYSTEM_PROMPT,
    userMessage: `Generate interview questions for this candidate and role:

CANDIDATE:
- Name: ${params.candidateName}
- Experience: ${expStr}
- Skills: ${skillsStr}
- Extra checks: ${extraChecks}
${trickiness ? `- ${trickiness}` : ""}

JOB DESCRIPTION:
${params.jobDescription}

TARGET LEVEL: ${params.difficulty || params.targetLevel || "Not specified"}

Generate ${params.count ?? 10} questions and ${params.challengeCount ?? 10} code snippets that can be used as coding challenges. For each QUESTION include:
- **answer**: concise answer shown to the candidate (2-4 sentences)
- **explanation**: detailed technical explanation of the solution/concept with depth matching the difficulty level (3-5 sentences)
- **simpleExplanation**: plain-language explanation followed by a concrete real-world analogy that makes the concept intuitive (2-3 sentences)
- **codeExamples**: 2 runnable code examples (JavaScript and TypeScript) demonstrating the concept
- **highlights**: 5-7 bullet-point key takeaways a strong candidate must know

For each SNIPPET include starter code, a short explanation, and additionally return the full solution and solutionExplanation — these solution fields are admin-only and must NOT be shown to candidates. Respect the generateType parameter if provided: questions, challenges, or both. If challengeGuideline is provided, use it to shape the generated code challenge idea.

Tailor everything to the candidate's background, job description, extra checks, and trickiness. Ensure diversity across difficulty levels when applicable.`,
  };
}

export function buildAnalyzePrompt(params: { problemStatement: string; code: string; language: string }) {
  return {
    systemPrompt: CODE_ANALYSIS_SYSTEM_PROMPT,
    userMessage: `Analyze this candidate's code submission:

PROBLEM STATEMENT:
${params.problemStatement}

CANDIDATE'S CODE (${params.language}):
\`\`\`${params.language}
${params.code}
\`\`\`

Provide your analysis.`,
  };
}

export function parseDifficultyFromJD(description: string): Difficulty {
  const lower = description.toLowerCase();
  if (lower.includes("senior") || lower.includes("staff") || lower.includes("lead")) return "senior";
  if (lower.includes("junior") || lower.includes("entry")) return "junior";
  return "mid";
}
