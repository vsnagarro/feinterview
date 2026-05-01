import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const mapDifficultyToLevel = (difficulty: string): string => {
  const map: Record<string, string> = { easy: "junior", medium: "mid", hard: "senior" };
  return map[difficulty] || "mid";
};

// QUESTIONS: Category, Question, Ideal Answer / What to Look For
const QUESTIONS = [
  {
    text: "What is the difference between == and === in JavaScript?",
    category: "JavaScript",
    difficulty: "easy",
    tags: ["operators"],
    answer: "=== checks both value AND type without coercion. == attempts type coercion. Always use ===.",
  },
  {
    text: "Explain hoisting in JavaScript",
    category: "JavaScript",
    difficulty: "medium",
    tags: ["hoisting"],
    answer: "var hoisted as undefined. let/const hoisted in TDZ. Functions hoisted completely. Look for: understanding var vs let/const.",
  },
  {
    text: "[] == ![] evaluates to what? Why?",
    category: "JavaScript",
    difficulty: "hard",
    tags: ["coercion"],
    answer: "true. ![] is false, [] coerced to 0, false coerced to 0. Look for: understanding coercion rules.",
  },
  {
    text: "What are closures?",
    category: "JavaScript",
    difficulty: "medium",
    tags: ["closures"],
    answer: "Function with access to enclosing scope variables. Inner function retains outer variables. Key concept for callbacks and data privacy.",
  },
  {
    text: "How does the event loop work?",
    category: "JavaScript",
    difficulty: "hard",
    tags: ["event-loop"],
    answer: "Single-threaded model: call stack, callback queue, microtask queue. Promises run before setTimeout. Look for: understanding async execution order.",
  },
  {
    text: "Difference between let, const, and var?",
    category: "JavaScript",
    difficulty: "medium",
    tags: ["variables"],
    answer: "var: function-scoped, hoisted. let/const: block-scoped, TDZ. const: cannot reassign (but can mutate object). Look for: scope and reassignment understanding.",
  },
  {
    text: "Explain prototypal inheritance",
    category: "JavaScript",
    difficulty: "hard",
    tags: ["prototypes"],
    answer: "Objects inherit via prototype chain. Use Object.create(parent). Look for: [[Prototype]], constructor functions.",
  },
  {
    text: "What does 'this' refer to?",
    category: "JavaScript",
    difficulty: "medium",
    tags: ["context"],
    answer: "Regular function: window/global. Method: object. Arrow: parent's this. Constructor: new instance. Look for: call/apply/bind understanding.",
  },
  {
    text: "Compare callbacks, promises, and async/await",
    category: "JavaScript",
    difficulty: "hard",
    tags: ["async"],
    answer: "Callbacks: callback hell. Promises: chainable. async/await: syntactic sugar, try/catch. Look for: error handling in each approach.",
  },
  {
    text: "Difference between null and undefined?",
    category: "JavaScript",
    difficulty: "easy",
    tags: ["types"],
    answer: "undefined: unassigned variable or missing param. null: intentional absence (typeof null is 'object' quirk). Look for: when each occurs naturally.",
  },
  {
    text: "React functional vs class components?",
    category: "React",
    difficulty: "medium",
    tags: ["components"],
    answer: "Functional: simpler, use hooks. Class: lifecycle methods, this.state. Modern: hooks preferred. Look for: hooks understanding.",
  },
  {
    text: "How does useEffect work?",
    category: "React",
    difficulty: "medium",
    tags: ["hooks"],
    answer: "Runs side effects after render. Dependency array: empty=once, undefined=every, [dep]=when dep changes. Look for: cleanup and infinite loop prevention.",
  },
  {
    text: "What is prop drilling?",
    category: "React",
    difficulty: "medium",
    tags: ["state"],
    answer: "Passing props through intermediate components. Solution: Context API or Redux. Look for: when to use Context vs composition.",
  },
  {
    text: "What is React.memo?",
    category: "React",
    difficulty: "hard",
    tags: ["optimization"],
    answer: "Prevents re-render if props unchanged. Careful with object/function props (use useMemo/useCallback). Look for: when it's actually beneficial.",
  },
  {
    text: "Explain TypeScript generics",
    category: "TypeScript",
    difficulty: "medium",
    tags: ["generics"],
    answer: "Reusable, type-safe code: function<T>(arg: T): T. Used with functions, classes, interfaces. Look for: type constraints, multiple generics.",
  },
  {
    text: "Interface vs Type in TypeScript?",
    category: "TypeScript",
    difficulty: "medium",
    tags: ["types"],
    answer: "Interface: mergeable, object shapes. Type: supports unions, no merging. Generally: interface for APIs, type for unions.",
  },
  {
    text: "What is 'unknown' type?",
    category: "TypeScript",
    difficulty: "medium",
    tags: ["types"],
    answer: "Safer than 'any'. Must type-guard before use. Example: if (typeof x === 'string'). Look for: type guards.",
  },
  {
    text: "Async/await error handling?",
    category: "TypeScript",
    difficulty: "medium",
    tags: ["async"],
    answer: "Use try/catch with async. Type 'unknown' in catch and guard properties. Look for: proper error handling.",
  },
  {
    text: "What is CSS Box Model?",
    category: "CSS",
    difficulty: "easy",
    tags: ["box"],
    answer: "Content -> Padding -> Border -> Margin. box-sizing: border-box includes padding/border. Look for: layer understanding.",
  },
  {
    text: "Flexbox vs Grid?",
    category: "CSS",
    difficulty: "medium",
    tags: ["layout"],
    answer: "Flexbox: 1D (row/column), content-driven. Grid: 2D, explicit. Flexbox for components, Grid for pages. Look for: 1D vs 2D understanding.",
  },
];

// CODE SNIPPETS: Challenge, Question, Expected Solution / Explanation
const CODE_SNIPPETS = [
  {
    title: "Array Flatten",
    code: "const arr = [1, [2, [3, 4]]];",
    language: "javascript",
    explanation: "Flatten to [1,2,3,4]. Solution: arr.flat(Infinity) or recursive. Look for: recursion and array methods.",
  },
  {
    title: "Debounce Function",
    code: "Create debounce that delays execution until X ms after last call.",
    language: "javascript",
    explanation: "Solution: use setTimeout and clear previous timeouts. Look for: closure and timer understanding.",
  },
  {
    title: "Memoization",
    code: "Create memoize function that caches results based on args.",
    language: "javascript",
    explanation: "Solution: use Map/object cache, return cached if args match. Look for: caching strategy.",
  },
  {
    title: "Promise Patterns",
    code: "Explain Promise.all vs Promise.race differences.",
    language: "javascript",
    explanation: "all: waits for all, rejects if any reject. race: returns first settled. Look for: promise handling understanding.",
  },
  {
    title: "Deep Clone",
    code: "Create deep clone handling nested objects and circular refs.",
    language: "javascript",
    explanation: "Solution: recursion + WeakMap for circular refs, or structuredClone(). Look for: deep vs shallow copy.",
  },
  {
    title: "React Counter",
    code: "Build counter with useState. Features: increment, decrement, reset.",
    language: "javascript",
    explanation: "Solution: useState(0), three buttons with onClick. Look for: hook usage and state updates.",
  },
  {
    title: "React Data Fetch",
    code: "Fetch API data on mount, handle loading and error states.",
    language: "javascript",
    explanation: "Solution: useEffect with [], manage loading/data/error. Look for: cleanup and dependency understanding.",
  },
  {
    title: "Flexbox Navbar",
    code: "Responsive nav that stacks vertically on mobile.",
    language: "css",
    explanation: "Solution: display:flex, flex-wrap, media queries. Look for: responsive design and flexbox.",
  },
  {
    title: "TypeScript Overload",
    code: "Function accepting different types, returning different types.",
    language: "typescript",
    explanation: "Solution: function overloads. Look for: type safety and overload syntax.",
  },
  {
    title: "Async Iterator",
    code: "Create async generator yielding API results.",
    language: "javascript",
    explanation: "Solution: async function* with yield. Use for await...of. Look for: async generators.",
  },
  {
    title: "Throttle Function",
    code: "Limit execution to once per X milliseconds.",
    language: "javascript",
    explanation: "Solution: use flag to track throttle window. Look for: rate limiting vs debounce.",
  },
  {
    title: "Custom Hook",
    code: "Create useLocalStorage syncing state with localStorage.",
    language: "javascript",
    explanation: "Solution: useState + useEffect reading/writing. Look for: hook composition.",
  },
  {
    title: "Event Delegation",
    code: "List item handler without adding listener to each item.",
    language: "javascript",
    explanation: "Solution: listener on parent, check e.target. Look for: event bubbling understanding.",
  },
  {
    title: "CSS Grid Layout",
    code: "Grid showing 1 col mobile, 2 tablet, 3 desktop.",
    language: "css",
    explanation: "Solution: grid-template-columns auto-fit minmax() or media queries. Look for: responsive grid.",
  },
  {
    title: "REST Error Handling",
    code: "Handle 401, 404, 500 responses appropriately.",
    language: "javascript",
    explanation: "Solution: check status code, throw specific errors. Look for: HTTP status understanding.",
  },
  {
    title: "Curry Function",
    code: "Transform f(a,b,c) into f(a)(b)(c).",
    language: "javascript",
    explanation: "Solution: recursively return functions until all args collected. Look for: functional programming.",
  },
  {
    title: "React Form",
    code: "Login form with email, password, errors and submission state.",
    language: "javascript",
    explanation: "Solution: useState per field, validation, loading state. Look for: controlled components.",
  },
  {
    title: "TypeScript Constraints",
    code: "Function working only with objects having specific property.",
    language: "typescript",
    explanation: "Solution: function<T extends {name: string}>(obj: T). Look for: type constraints.",
  },
  {
    title: "Intersection Observer",
    code: "Lazy load images using Intersection Observer API.",
    language: "javascript",
    explanation: "Solution: IntersectionObserver watching img elements. Look for: modern DOM API.",
  },
  {
    title: "useReducer Pattern",
    code: "State management solution using useReducer.",
    language: "javascript",
    explanation: "Solution: useReducer for complex state, dispatch actions. Look for: reducer pattern.",
  },
];

export async function POST() {
  try {
    const supabase = await createServiceClient();

    console.log("📝 Seeding questions...");
    const qToInsert = QUESTIONS.map((q) => ({
      text: q.text,
      category: q.category,
      level: mapDifficultyToLevel(q.difficulty),
      answer: q.answer,
      languages: q.tags,
    }));
    const { error: qErr } = await supabase.from("questions").insert(qToInsert);
    if (qErr) throw qErr;
    console.log(`✅ Inserted ${qToInsert.length} questions`);

    console.log("📝 Seeding code snippets...");
    const sToInsert = CODE_SNIPPETS.map((s) => ({
      title: s.title,
      code: s.code,
      language: s.language,
      explanation: s.explanation,
    }));
    const { error: sErr } = await supabase.from("code_snippets").insert(sToInsert);
    if (sErr) throw sErr;
    console.log(`✅ Inserted ${sToInsert.length} code snippets`);

    return NextResponse.json({ success: true, message: "Seeded successfully", questionsInserted: qToInsert.length, snippetsInserted: sToInsert.length }, { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
