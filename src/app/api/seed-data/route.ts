import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const QUESTIONS = [
  { text: '[] == ![]', category: 'JavaScript', difficulty: 'hard', tags: ['coercion', 'operators'], answer: 'true. (Coercion: ![] is false, [] is coerced to 0, false is coerced to 0).' },
  { text: 'const x = [1,2]; x.push(3);', category: 'JavaScript', difficulty: 'easy', tags: ['const', 'mutability'], answer: 'No. const prevents re-assignment of the variable, but the object/array itself is still mutable.' },
  { text: 'console.log(typeof NaN)', category: 'JavaScript', difficulty: 'medium', tags: ['typeof', 'NaN'], answer: '"number". (Logic: NaN stands for Not-a-Number, but its type is numeric).' },
  { text: 'setTimeout(()=>console.log(1),0); console.log(2);', category: 'JavaScript', difficulty: 'medium', tags: ['async', 'event-loop'], answer: '2, 1. (Synchronous code runs before the event loop task).' },
  { text: 'function a() { return { b: 1 } } vs return \\n {b:1}', category: 'JavaScript', difficulty: 'hard', tags: ['ASI', 'semicolons'], answer: 'Second returns undefined due to Automatic Semicolon Insertion (ASI).' },
  { text: '[1, 2, 11].sort()', category: 'JavaScript', difficulty: 'medium', tags: ['arrays', 'sort'], answer: '[1, 11, 2]. (Sort converts to strings; "11" comes before "2").' },
  { text: 'const a = {}; const b = {key:"b"}; a[b] = 123;', category: 'JavaScript', difficulty: 'hard', tags: ['objects', 'keys'], answer: '123. (Object keys are stringified to "[object Object]").' },
  { text: '(function(){ var a = b = 3; })();', category: 'JavaScript', difficulty: 'medium', tags: ['scope', 'globals'], answer: 'Yes. b becomes a global variable because it lacks a keyword.' },
  { text: '0.1 + 0.2 === 0.3', category: 'JavaScript', difficulty: 'medium', tags: ['floating-point', 'precision'], answer: 'false. (Floating point precision leads to 0.30000000000000004).' },
  { text: 'type T = string & number', category: 'TypeScript', difficulty: 'medium', tags: ['types', 'intersection'], answer: '"never". (A value cannot be both a string and a number).' },
  { text: 'const user = { name: "A" }; Object.freeze(user); user.name = "B";', category: 'JavaScript', difficulty: 'medium', tags: ['freeze', 'immutability'], answer: 'user.name remains "A". (Freeze makes it immutable).' },
  { text: 'let x = 1; let y = x++;', category: 'JavaScript', difficulty: 'easy', tags: ['increment', 'operators'], answer: '1. (Post-increment returns value before adding).' },
  { text: 'console.log(1 < 2 < 3)', category: 'JavaScript', difficulty: 'hard', tags: ['comparison', 'coercion'], answer: 'true. (1 < 2 is true (1), 1 < 3 is true).' },
  { text: 'console.log(3 < 2 < 1)', category: 'JavaScript', difficulty: 'hard', tags: ['comparison', 'coercion'], answer: 'true. (3 < 2 is false (0), 0 < 1 is true).' },
  { text: 'React.useEffect(() => { ... }, [obj])', category: 'React', difficulty: 'medium', tags: ['hooks', 'dependencies'], answer: 'Infinite loop. {} is a new reference every render.' },
  { text: 'const [val, setVal] = useState(0); setVal(val + 1); setVal(val + 1);', category: 'React', difficulty: 'medium', tags: ['state', 'batching'], answer: '1. (State updates are batched; both use the same initial val).' },
  { text: 'interface A { x: number }; interface A { y: number };', category: 'TypeScript', difficulty: 'medium', tags: ['interfaces', 'merging'], answer: 'A has both x and y. (Interface merging).' },
  { text: '(true && "Hello")', category: 'JavaScript', difficulty: 'easy', tags: ['logical-operators', '&& '], answer: '"Hello".' },
  { text: '(false && "Hello")', category: 'JavaScript', difficulty: 'easy', tags: ['logical-operators', '&&'], answer: 'false.' },
  { text: '!!"" ', category: 'JavaScript', difficulty: 'easy', tags: ['coercion', 'boolean'], answer: 'false. (Empty string is falsy).' },
  { text: 'console.log(1 + "1")', category: 'JavaScript', difficulty: 'easy', tags: ['coercion', 'string'], answer: '"11".' },
  { text: 'console.log(1 - "1")', category: 'JavaScript', difficulty: 'easy', tags: ['coercion', 'numeric'], answer: '0. (Minus forces numeric conversion).' },
  { text: 'fetch().then(r => r.json()).catch(e => ...)', category: 'JavaScript', difficulty: 'medium', tags: ['fetch', 'promises'], answer: 'No. fetch only rejects on network failure, not HTTP errors.' },
  { text: 'const x = async () => 1;', category: 'JavaScript', difficulty: 'medium', tags: ['async', 'promises'], answer: 'Promise. (Async functions always return promises).' },
  { text: 'div { margin: 10px 5px; }', category: 'CSS', difficulty: 'easy', tags: ['margin', 'css'], answer: '10px. (Shorthand: top/bottom = first value).' },
  { text: 'const arr = [1, 2, 3]; arr[10] = 99;', category: 'JavaScript', difficulty: 'medium', tags: ['arrays', 'length'], answer: '11. (Creates "holes" in the array).' },
  { text: 'Array.isArray(null)', category: 'JavaScript', difficulty: 'easy', tags: ['arrays', 'type-checking'], answer: 'false.' },
  { text: 'Node: module.exports = { a: 1 }; exports.b = 2;', category: 'Node.js', difficulty: 'medium', tags: ['modules', 'exports'], answer: '{ a: 1 }. (module.exports overrides exports).' },
]

const CODE_SNIPPETS = [
  { title: 'useMemo vs useCallback', code: 'useMemo caches a value; useCallback caches a function instance', language: 'javascript', category: 'React', difficulty: 'medium', tags: ['hooks', 'performance'], description: 'Difference between useMemo and useCallback hooks' },
  { title: 'Virtual DOM Diffing', code: 'React calculates minimum changes (diffing) and batches updates', language: 'javascript', category: 'React', difficulty: 'medium', tags: ['virtual-dom', 'performance'], description: 'How Virtual DOM improves performance' },
  { title: 'Rules of Hooks', code: 'Hooks must be called at top level, not in loops/conditions, only from React functions', language: 'javascript', category: 'React', difficulty: 'medium', tags: ['hooks', 'react'], description: 'Rules of Hooks in React' },
  { title: 'Prop Drilling Problem', code: 'Passing data through multiple layers. Use Context API or Redux to solve', language: 'javascript', category: 'React', difficulty: 'medium', tags: ['props', 'state-management'], description: 'Understanding and solving prop drilling' },
  { title: 'Controlled Components', code: 'const [val, setVal] = useState(""); return <input value={val} onChange={e => setVal(e.target.value)} />', language: 'javascript', category: 'React', difficulty: 'easy', tags: ['forms', 'state'], description: 'Form data handled by React state' },
  { title: 'Hoisting Explanation', code: 'var x; // hoisted\nconsole.log(x); // undefined\nx = 1;\nlet y; // not hoisted (TDZ)\nconsole.log(y); // ReferenceError', language: 'javascript', category: 'JavaScript', difficulty: 'medium', tags: ['hoisting', 'scope'], description: 'JavaScript hoisting with var, let, const' },
  { title: 'Closures Example', code: 'function outer() { const x = 1; return () => x; }\nconst fn = outer();\nconsole.log(fn()); // 1 (closure remembers x)', language: 'javascript', category: 'JavaScript', difficulty: 'medium', tags: ['closures', 'scope'], description: 'Understanding closures in JavaScript' },
  { title: 'Promise Creation', code: 'const p = new Promise((resolve, reject) => { setTimeout(() => resolve(\'done\'), 1000); })\np.then(r => console.log(r)).catch(e => console.error(e))', language: 'javascript', category: 'JavaScript', difficulty: 'medium', tags: ['promises', 'async'], description: 'Creating and using Promises' },
  { title: 'Prototypal Inheritance', code: 'const parent = { greet() { return "Hello"; } };\nconst child = Object.create(parent);\nconsole.log(child.greet()); // "Hello"', language: 'javascript', category: 'JavaScript', difficulty: 'hard', tags: ['prototypes', 'inheritance'], description: 'Prototypal inheritance in JavaScript' },
  { title: 'Event Loop & Concurrency', code: 'setTimeout(() => console.log("async"), 0);\nPromise.resolve().then(() => console.log("microtask"));\nconsole.log("sync");\n// Output: sync, microtask, async', language: 'javascript', category: 'Node.js', difficulty: 'hard', tags: ['event-loop', 'concurrency'], description: 'How Node.js handles concurrency' },
  { title: 'Express Middleware', code: 'app.use((req, res, next) => {\n  console.log(req.method);\n  next();\n});', language: 'javascript', category: 'Node.js', difficulty: 'easy', tags: ['express', 'middleware'], description: 'Middleware in Express.js' },
  { title: 'nextTick vs setImmediate', code: 'process.nextTick(() => console.log("nextTick"));\nsetImmediate(() => console.log("setImmediate"));\n// Output: nextTick, setImmediate', language: 'javascript', category: 'Node.js', difficulty: 'medium', tags: ['event-loop', 'timers'], description: 'Difference between process.nextTick and setImmediate' },
  { title: 'Worker Threads for CPU', code: 'const { Worker } = require("worker_threads");\nconst worker = new Worker("./worker.js");\nworker.on("message", msg => console.log(msg));', language: 'javascript', category: 'Node.js', difficulty: 'hard', tags: ['performance', 'threading'], description: 'Using Worker Threads for CPU-intensive tasks' },
  { title: 'TypeScript Interface vs Type', code: 'interface A { x: number; }\ninterface A { y: number; } // Merges\n\ntype B = { x: number; } & { y: number; }; // Intersection', language: 'typescript', category: 'TypeScript', difficulty: 'medium', tags: ['types', 'interfaces'], description: 'Differences between Interface and Type in TypeScript' },
  { title: 'Unknown Type', code: 'const x: unknown = "hello";\nif (typeof x === "string") {\n  console.log(x.toUpperCase()); // Safe\n}', language: 'typescript', category: 'TypeScript', difficulty: 'medium', tags: ['types', 'type-safety'], description: 'Using unknown for type-safe operations' },
  { title: 'TypeScript Generics', code: 'function identity<T>(arg: T): T { return arg; }\nconst x = identity<string>("hello");\nconst y = identity<number>(42);', language: 'typescript', category: 'TypeScript', difficulty: 'medium', tags: ['generics', 'types'], description: 'Using Generics in TypeScript' },
  { title: 'Type Narrowing', code: 'function process(x: string | number) {\n  if (typeof x === "string") {\n    console.log(x.toUpperCase());\n  } else {\n    console.log(x * 2);\n  }\n}', language: 'typescript', category: 'TypeScript', difficulty: 'medium', tags: ['type-narrowing', 'guards'], description: 'Type narrowing with typeof and type guards' },
  { title: 'Readonly Properties', code: 'interface Config {\n  readonly apiUrl: string;\n}\nconst config: Config = { apiUrl: "https://api.example.com" };\nconfig.apiUrl = "https://new.com"; // Error!', language: 'typescript', category: 'TypeScript', difficulty: 'easy', tags: ['readonly', 'immutability'], description: 'Using readonly in TypeScript interfaces' },
  { title: 'Prompt Engineering', code: '// Good prompt with context, task, constraints\n"As an expert developer, write a React hook for pagination.\nRequirements:\n- Handle prev/next\n- Show current page\n- Validate bounds"', language: 'javascript', category: 'AI Skills', difficulty: 'medium', tags: ['prompting', 'llm'], description: 'Structured prompt design for better LLM outputs' },
  { title: 'Prevent AI Hallucinations', code: '// Use RAG + few-shot examples\nconst context = fetchFromKnowledgeBase();\nconst examples = [\n  { input: "...", output: "..." },\n  { input: "...", output: "..." }\n];', language: 'javascript', category: 'AI Skills', difficulty: 'hard', tags: ['rag', 'llm'], description: 'Techniques to reduce AI hallucinations' },
  { title: 'Agentic Workflow', code: '// Agent uses tools to complete tasks\nconst agent = new Agent({\n  tools: [searchTool, calculatorTool, apiTool],\n  model: "gpt-4"\n});\nawait agent.run("Find and analyze market data");', language: 'javascript', category: 'AI Skills', difficulty: 'hard', tags: ['agents', 'tools'], description: 'Building agentic workflows with LLMs' },
  { title: 'Understanding Tokens', code: '// Tokens are sub-words\n"hello" = 1 token\n"beautiful" = 1-2 tokens\n"ChatGPT" = 1-2 tokens\n// ~1 token ≈ 4 characters in English', language: 'javascript', category: 'AI Skills', difficulty: 'easy', tags: ['tokens', 'llm'], description: 'Understanding tokens in Large Language Models' },
  { title: 'CSS Box Model', code: '.box {\n  content: 100px;\n  padding: 20px;  /* inside border */\n  border: 5px;    /* around padding */\n  margin: 10px;   /* outside border */\n}', language: 'css', category: 'HTML/CSS', difficulty: 'easy', tags: ['box-model', 'layout'], description: 'The CSS Box Model structure' },
  { title: 'Flexbox vs Grid', code: '/* Flexbox - 1D */\n.flex { display: flex; flex-direction: column; }\n\n/* Grid - 2D */\n.grid { display: grid; grid-template-columns: 1fr 1fr; }', language: 'css', category: 'HTML/CSS', difficulty: 'medium', tags: ['layout', 'flexbox', 'grid'], description: 'Comparing Flexbox (1D) and Grid (2D) layouts' },
  { title: 'Semantic HTML', code: '<header>\n  <nav>Navigation</nav>\n</header>\n<main>\n  <article>\n    <h1>Title</h1>\n    <p>Content</p>\n  </article>\n</main>\n<footer>Footer</footer>', language: 'html', category: 'HTML/CSS', difficulty: 'easy', tags: ['semantic', 'accessibility'], description: 'Using semantic HTML tags' },
  { title: 'Microservices Architecture', code: '// Break monolith into services\nUserService -> /api/users\nOrderService -> /api/orders\nPaymentService -> /api/payments\n// Services communicate via APIs (REST/gRPC)', language: 'javascript', category: 'Architecture', difficulty: 'hard', tags: ['microservices', 'architecture'], description: 'Microservices architecture pattern' },
  { title: 'Serverless Computing', code: '// AWS Lambda function\nexports.handler = async (event) => {\n  return { statusCode: 200, body: "Hello" };\n};\n// AWS manages servers; pay only for execution time', language: 'javascript', category: 'Architecture', difficulty: 'medium', tags: ['serverless', 'lambda'], description: 'Serverless computing with AWS Lambda' },
  { title: 'CORS Explanation', code: '// Frontend (http://example.com) requests API (http://api.example.com)\n// Browser blocks unless API returns:\n// Access-Control-Allow-Origin: http://example.com\n// Access-Control-Allow-Methods: GET, POST\n// Access-Control-Allow-Headers: Content-Type', language: 'javascript', category: 'Architecture', difficulty: 'medium', tags: ['cors', 'security'], description: 'Understanding Cross-Origin Resource Sharing (CORS)' },
]

export async function POST() {
  try {
    const supabase = await createClient()

    // Insert questions
    console.log('📝 Seeding questions...')
    const { error: qError } = await supabase.from('questions').insert(QUESTIONS)
    if (qError) throw qError
    console.log(`✅ Inserted ${QUESTIONS.length} questions`)

    // Insert code snippets
    console.log('📝 Seeding code snippets...')
    const { error: sError } = await supabase.from('code_snippets').insert(CODE_SNIPPETS)
    if (sError) throw sError
    console.log(`✅ Inserted ${CODE_SNIPPETS.length} code snippets`)

    return NextResponse.json(
      {
        success: true,
        message: 'Database seeded successfully',
        questionsInserted: QUESTIONS.length,
        snippetsInserted: CODE_SNIPPETS.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Seeding error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
