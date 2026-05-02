// Database row types generated from Supabase schema

export interface Interviewer {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  experience_level?: string;
  skills: string[];
  summary?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface JobDescription {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  tech_stack: string[];
  experience_level?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  challenge_token: string;
  candidate_id: string;
  job_description_id: string;
  interviewer_id: string;
  status: "pending" | "active" | "submitted" | "completed" | "expired";
  languages: string[];
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface CodeSubmission {
  id: string;
  session_id: string;
  code: string;
  language: string;
  submitted_at: string;
  analysis?: Record<string, unknown>;
}

export interface Question {
  id: string;
  text: string;
  category?: string;
  level?: string;
  answer: string;
  explanation?: string;
  languages: string[];
  question_type?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  difficulty?: string;
  description?: string;
  explanation?: string;
  tags: string[];
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CodeChallenge {
  id: string;
  session_id?: string;
  title: string;
  problem_statement: string;
  use_case?: string;
  requirements?: string[];
  workspace_template?: string;
  sandbox_dependencies?: Record<string, string>;
  starter_code?: string;
  supported_languages?: string[];
  time_limit_minutes?: number;
  snippet_id?: string;
  solution?: string | null;
  solution_explanation?: string | null;
  admin_only?: boolean | null;
  created_at: string;
}

// Database type for backwards compatibility with existing components
export interface Database {
  public: {
    Tables: {
      questions: { Row: Question };
      code_snippets: { Row: CodeSnippet };
      candidates: { Row: Candidate };
      job_descriptions: { Row: JobDescription };
      sessions: { Row: Session };
      code_submissions: { Row: CodeSubmission };
      code_challenges: { Row: CodeChallenge };
      interviewers: { Row: Interviewer };
    };
  };
}
