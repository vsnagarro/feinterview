#!/usr/bin/env node
// Simple admin script that inserts placeholder questions and a challenge
// into a session using the Supabase REST API and the service role key.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node scripts/admin/regenerate_session.js <sessionId>");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function insertQuestions() {
  const questions = [
    {
      session_id: sessionId,
      question_id: null,
      question: "What is React?",
      answer: "React is a JavaScript library for building UIs.",
      explanation: "React organizes UI into components.",
      order_index: 0,
    },
    {
      session_id: sessionId,
      question_id: null,
      question: "Explain hooks",
      answer: "Hooks let you use state and lifecycle in function components.",
      explanation: "useState and useEffect are common hooks.",
      order_index: 1,
    },
  ];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/session_questions`, {
    method: "POST",
    headers,
    body: JSON.stringify(questions),
  });

  const text = await res.text();
  console.log("session_questions insert status:", res.status);
  console.log(text);
}

async function insertChallenge() {
  const challenge = {
    session_id: sessionId,
    title: "Generated: Build a counter",
    problem_statement: "Implement a counter component with increment/decrement and tests.",
    starter_code: "export default function Counter() { return null }",
    supported_languages: ["javascript"],
    time_limit_minutes: 30,
    use_case: "Follow job description",
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/code_challenges`, {
    method: "POST",
    headers,
    body: JSON.stringify([challenge]),
  });

  const text = await res.text();
  console.log("code_challenges insert status:", res.status);
  console.log(text);
}

(async () => {
  try {
    await insertQuestions();
    await insertChallenge();
    console.log("Done.");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
