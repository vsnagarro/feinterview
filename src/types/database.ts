// This file will be replaced by: npx supabase gen types typescript --project-id <id> > src/types/database.ts
// Placeholder types until Supabase project is configured

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          question: string
          answer: string
          tags: string[]
          difficulty: string
          topic: string | null
          source: string
        }
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['questions']['Insert']>
      }
      code_snippets: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          language: string
          code: string
          explanation: string | null
          tags: string[]
          difficulty: string
          source: string
        }
        Insert: Omit<Database['public']['Tables']['code_snippets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['code_snippets']['Insert']>
      }
      candidates: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string | null
          skills: string[]
          years_exp: number | null
          notes: string | null
          resume_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['candidates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['candidates']['Insert']>
      }
      job_descriptions: {
        Row: {
          id: string
          created_at: string
          title: string
          company: string | null
          description: string
          skills: string[]
        }
        Insert: Omit<Database['public']['Tables']['job_descriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['job_descriptions']['Insert']>
      }
      interview_sessions: {
        Row: {
          id: string
          created_at: string
          candidate_id: string
          jd_id: string | null
          difficulty: string
          status: string
          scheduled_at: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['interview_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['interview_sessions']['Insert']>
      }
      session_questions: {
        Row: {
          id: string
          session_id: string
          question_id: string | null
          question: string
          answer: string
          order_index: number
          asked: boolean
          rating: number | null
        }
        Insert: Omit<Database['public']['Tables']['session_questions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['session_questions']['Insert']>
      }
      code_challenges: {
        Row: {
          id: string
          created_at: string
          session_id: string | null
          title: string
          problem_statement: string
          starter_code: string | null
          supported_languages: string[]
          time_limit_minutes: number | null
        }
        Insert: Omit<Database['public']['Tables']['code_challenges']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['code_challenges']['Insert']>
      }
      challenge_links: {
        Row: {
          id: string
          created_at: string
          challenge_id: string
          token: string
          expires_at: string
          is_active: boolean
          opened_at: string | null
          candidate_name: string | null
        }
        Insert: Omit<Database['public']['Tables']['challenge_links']['Row'], 'id' | 'created_at' | 'token'>
        Update: Partial<Database['public']['Tables']['challenge_links']['Insert']>
      }
      challenge_submissions: {
        Row: {
          id: string
          created_at: string
          link_id: string
          language: string
          code: string
          is_snapshot: boolean
          ai_analysis: Json | null
        }
        Insert: Omit<Database['public']['Tables']['challenge_submissions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['challenge_submissions']['Insert']>
      }
      live_code_state: {
        Row: {
          link_id: string
          language: string
          code: string
          updated_at: string
        }
        Insert: Database['public']['Tables']['live_code_state']['Row']
        Update: Partial<Database['public']['Tables']['live_code_state']['Row']>
      }
    }
  }
}
