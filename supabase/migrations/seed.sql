-- Canonical seed data.
-- Run after 0001_initial_schema.sql and 0002_schema_unification.sql.

insert into questions (category, text, answer, level, languages, question_type) values
('React','Difference between useMemo and useCallback?','useMemo caches a value; useCallback caches a function instance to prevent unnecessary child re-renders.','mid','{"react"}','short_answer'),
('React','How does the Virtual DOM improve performance?','It computes minimal DOM updates and batches changes to avoid unnecessary browser work.','junior','{"react"}','short_answer'),
('React','What are controlled components?','Controlled components keep form state in React and update through event handlers.','junior','{"react"}','short_answer'),
('JavaScript','Difference between == and ===?','=== compares without coercion; == performs coercion first.','junior','{"javascript"}','short_answer'),
('JavaScript','What is hoisting?','JavaScript hoists declarations to the top of scope; let and const remain unusable before initialization.','junior','{"javascript"}','short_answer'),
('JavaScript','Explain closures.','A closure retains access to the lexical scope where it was created.','junior','{"javascript"}','short_answer'),
('Node.js','How does Node handle concurrency?','Node uses the event loop and non-blocking I/O to handle concurrent operations efficiently.','junior','{"node.js"}','short_answer'),
('TypeScript','What does unknown mean?','unknown is a type-safe alternative to any that requires narrowing before use.','junior','{"typescript"}','short_answer'),
('TypeScript','What are generics?','Generics let you write reusable code that operates across multiple concrete types.','junior','{"typescript"}','short_answer'),
('Architecture','What is CORS?','Cross-Origin Resource Sharing controls when a browser can access resources from another origin.','junior','{"http"}','short_answer');

insert into code_snippets (title, code, explanation, language, difficulty, tags, source) values
('[] == ![]','console.log([] == ![]);','This evaluates to true because both sides are coerced to 0 during comparison.','javascript','mid','{"coercion"}','manual'),
('push on const array','const x = [1, 2]; x.push(3);','const prevents reassignment, not mutation of the array value itself.','javascript','junior','{"const","arrays"}','manual'),
('typeof NaN','console.log(typeof NaN);','typeof NaN returns number even though NaN represents an invalid numeric result.','javascript','junior','{"types"}','manual'),
('setTimeout order','setTimeout(() => console.log(1), 0); console.log(2);','Synchronous code runs first, so the output is 2 then 1.','javascript','junior','{"event-loop"}','manual'),
('type intersection','type T = string & number','This resolves to never because no value can be both string and number at the same time.','typescript','mid','{"types"}','manual');
