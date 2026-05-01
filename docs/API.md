# API Documentation

## Coding Challenge & Interview Platform

---

## Base URLs

- **Development:** `http://localhost:3000/api`
- **Production:** `https://yourdomain.vercel.app/api`

---

## Authentication

All protected endpoints require an `Authorization` header:

```
Authorization: Bearer {token}
```

Public endpoints (no auth required):

- GET `/api/challenge/{token}`
- POST `/api/challenge/{token}/submit`

---

## Authentication Endpoints

### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "interviewer@example.com",
  "password": "password123"
}

Response (200):
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "interviewer@example.com",
    "name": "John Doe"
  }
}

Error (401):
{ "error": "Invalid credentials" }
```

### Get Session

```
GET /api/auth/session
Authorization: Bearer {token}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "interviewer@example.com"
  }
}
```

### Logout

```
POST /api/auth/logout

Response (200):
{ "message": "Logged out successfully" }
```

---

## Candidate Endpoints

### Create Candidate

```
POST /api/candidates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "experience_level": "Mid",
  "skills": ["JavaScript", "React", "TypeScript"],
  "summary": "5 years of full-stack development experience"
}

Response (201):
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "experience_level": "Mid",
  "skills": ["JavaScript", "React", "TypeScript"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Get All Candidates

```
GET /api/candidates
Authorization: Bearer {token}

Response (200):
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "experience_level": "Mid",
    "skills": ["JavaScript", "React"],
    "summary": "...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Single Candidate

```
GET /api/candidates/{id}
Authorization: Bearer {token}

Response (200):
{ candidate object }
```

### Update Candidate

```
PUT /api/candidates/{id}
Authorization: Bearer {token}
Content-Type: application/json

{ "name": "Jane Doe", ... }

Response (200):
{ updated candidate object }
```

### Delete Candidate

```
DELETE /api/candidates/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Candidate deleted successfully" }
```

---

## Job Description Endpoints

### Create Job Description

```
POST /api/job-descriptions
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Senior React Developer",
  "description": "We are hiring a Senior React Developer...",
  "required_skills": ["React", "TypeScript", "Node.js"],
  "tech_stack": ["React", "Next.js", "PostgreSQL"],
  "experience_level": "Senior"
}

Response (201):
{
  "id": "uuid",
  "title": "Senior React Developer",
  "description": "...",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get All Job Descriptions

```
GET /api/job-descriptions
Authorization: Bearer {token}

Response (200):
[{ job description objects }]
```

### Get Single Job Description

```
GET /api/job-descriptions/{id}
Authorization: Bearer {token}

Response (200):
{ job description object }
```

### Update Job Description

```
PUT /api/job-descriptions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{ "title": "...", ... }

Response (200):
{ updated job description object }
```

### Delete Job Description

```
DELETE /api/job-descriptions/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Job description deleted" }
```

---

## Session Endpoints

### Create Challenge Session

```
POST /api/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "candidate_id": "uuid",
  "job_description_id": "uuid",
  "languages": ["javascript", "python"],
  "expires_in_hours": 24
}

Response (201):
{
  "id": "uuid",
  "challenge_token": "abc123xyz789...",
  "challenge_link": "https://yourdomain.com/challenge/abc123xyz789",
  "candidate_id": "uuid",
  "job_description_id": "uuid",
  "languages": ["javascript", "python"],
  "status": "active",
  "expires_at": "2024-01-02T00:00:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get All Sessions

```
GET /api/sessions
Authorization: Bearer {token}

Optional query params:
  ?status=active
  ?candidate_id=uuid
  ?limit=10&offset=0

Response (200):
[{ session objects }]
```

### Get Single Session

```
GET /api/sessions/{id}
Authorization: Bearer {token}

Response (200):
{
  "id": "uuid",
  "challenge_token": "...",
  "candidate_id": "uuid",
  "status": "active",
  "submissions": [
    {
      "id": "uuid",
      "code": "function hello() {...}",
      "language": "javascript",
      "submitted_at": "2024-01-01T12:00:00Z",
      "analysis": null
    }
  ]
}
```

### Update Session

```
PUT /api/sessions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{ "status": "completed" }

Response (200):
{ updated session object }
```

### Delete Session

```
DELETE /api/sessions/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Session deleted" }
```

---

## Public Challenge Endpoints (No Auth Required)

### Get Challenge Metadata

```
GET /api/challenge/{token}

Response (200):
{
  "id": "uuid",
  "candidate_name": "John Doe",
  "job_title": "Senior React Developer",
  "description": "Build a todo app in React...",
  "languages": ["javascript", "python"],
  "expires_at": "2024-01-02T00:00:00Z"
}

Error (404):
{ "error": "Challenge not found or expired" }
```

### Submit Code

```
POST /api/challenge/{token}/submit
Content-Type: application/json

{
  "code": "function hello() { console.log('hello'); }",
  "language": "javascript"
}

Response (201):
{
  "submission_id": "uuid",
  "submitted_at": "2024-01-01T12:30:00Z",
  "message": "Code submitted successfully"
}

Error (404):
{ "error": "Challenge expired or not found" }
```

---

## Question Endpoints

### Generate Questions (AI)

```
POST /api/ai/generate-questions
Authorization: Bearer {token}
Content-Type: application/json

{
  "candidate_id": "uuid",
  "job_description_id": "uuid",
  "count": 5,
  "question_types": ["code_challenge", "short_answer", "mcq"],
  "level": "Senior"
}

Response (200):
{
  "questions": [
    {
      "text": "Explain closures in JavaScript",
      "type": "short_answer",
      "answer": "A closure is a function that has access to variables...",
      "explanation": "Closures are created every time...",
      "level": "Mid",
      "languages": ["javascript"]
    },
    {
      "text": "Build a function that...",
      "type": "code_challenge",
      "answer": "function solve() {...}",
      "explanation": "This function works by...",
      "level": "Senior",
      "languages": ["javascript"]
    }
  ]
}
```

### Create Question (Manual)

```
POST /api/questions
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "What is a closure?",
  "category": "JavaScript",
  "level": "Mid",
  "answer": "A closure is a function that has access to variables...",
  "explanation": "Closures are created every time a function is created...",
  "languages": ["javascript"],
  "question_type": "short_answer"
}

Response (201):
{ question object with id, created_at, etc. }
```

### Get All Questions

```
GET /api/questions
Authorization: Bearer {token}

Optional query params:
  ?level=Mid
  ?category=JavaScript
  ?search=closure
  ?question_type=short_answer

Response (200):
[{ question objects }]
```

### Get Single Question

```
GET /api/questions/{id}
Authorization: Bearer {token}

Response (200):
{ question object }
```

### Update Question

```
PUT /api/questions/{id}
Authorization: Bearer {token}
Content-Type: application/json

{ "text": "Updated question...", ... }

Response (200):
{ updated question object }
```

### Delete Question

```
DELETE /api/questions/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Question deleted" }
```

---

## Code Snippet Endpoints

### Create Snippet

```
POST /api/code-snippets
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "React Functional Component",
  "code": "function MyComponent() { return <div>Hello</div>; }",
  "language": "javascript",
  "level": "Junior",
  "category": "React",
  "explanation": "This is a basic functional component...",
  "tags": ["component", "hooks"]
}

Response (201):
{ snippet object with id, created_at, etc. }
```

### Get All Snippets

```
GET /api/code-snippets
Authorization: Bearer {token}

Optional query params:
  ?language=javascript
  ?level=Junior
  ?category=React
  ?search=component

Response (200):
[{ snippet objects }]
```

### Get Single Snippet

```
GET /api/code-snippets/{id}
Authorization: Bearer {token}

Response (200):
{ snippet object }
```

### Update Snippet

```
PUT /api/code-snippets/{id}
Authorization: Bearer {token}

Response (200):
{ updated snippet object }
```

### Delete Snippet

```
DELETE /api/code-snippets/{id}
Authorization: Bearer {token}

Response (200):
{ "message": "Snippet deleted" }
```

---

## Code Analysis Endpoints

### Analyze Code (AI)

```
POST /api/ai/analyze-code
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript",
  "context": "Senior React Developer role interview"
}

Response (200):
{
  "quality_score": 85,
  "analysis": {
    "strengths": [
      "Clean and simple function",
      "Readable variable names"
    ],
    "improvements": [
      "Add JSDoc comments",
      "Add error handling for non-numeric inputs",
      "Consider parameter validation"
    ],
    "issues": [],
    "best_practices": "Function follows basic best practices"
  },
  "follow_up_questions": [
    "How would you optimize this for performance?",
    "Would you add TypeScript types? How?",
    "How would you handle edge cases like null or undefined?"
  ]
}
```

---

## WebSocket / Real-Time Endpoints

### Subscribe to Session Updates

```
WebSocket connection:
wss://yourdomain.com/api/sessions/{id}/realtime

Authorization:
Send token in query: ?token=<jwt_token>
Or in headers if server supports

Message types:
{
  "type": "code_submitted",
  "data": {
    "submission_id": "uuid",
    "code": "function hello() {...}",
    "language": "javascript",
    "submitted_at": "2024-01-01T12:00:00Z"
  }
}

{
  "type": "analysis_complete",
  "data": {
    "submission_id": "uuid",
    "analysis": { ...analysis object }
  }
}

{
  "type": "session_expired",
  "data": {
    "message": "This session has expired"
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "status": 400,
  "details": {}
}
```

### Common HTTP Status Codes

| Status | Meaning                                      |
| ------ | -------------------------------------------- |
| 200    | OK - Request successful                      |
| 201    | Created - Resource created successfully      |
| 400    | Bad Request - Invalid input/validation error |
| 401    | Unauthorized - Missing or invalid token      |
| 403    | Forbidden - Insufficient permissions         |
| 404    | Not Found - Resource doesn't exist           |
| 429    | Too Many Requests - Rate limit exceeded      |
| 500    | Internal Server Error - Server error         |

---

## Rate Limiting

Applied to prevent abuse:

| Endpoint          | Limit       | Window   |
| ----------------- | ----------- | -------- |
| AI endpoints      | 10 req/min  | Per user |
| General endpoints | 100 req/min | Per user |
| Auth endpoints    | 5 req/min   | Per IP   |

Headers returned:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1234567890
```

---

## Pagination

List endpoints support pagination:

```
GET /api/candidates?limit=10&offset=0

Response:
{
  "data": [...],
  "total": 50,
  "limit": 10,
  "offset": 0
}
```
