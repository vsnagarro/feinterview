"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Challenge {
  id: string;
  title?: string;
  problemStatement?: string;
  languages: string[];
  timeLimitMinutes?: number;
}

interface Candidate {
  id: string;
  name: string;
  experience_level?: string;
}

interface JobDescription {
  id: string;
  title: string;
  description: string;
  required_skills?: string[];
  tech_stack?: string[];
}

interface ChallengeData {
  session: Challenge;
  candidate: Candidate;
  jobDescription: JobDescription;
}

interface Submission {
  id: string;
  code: string;
  language: string;
  submitted_at: string;
}

export function PublicChallengeClient({ token }: { token: string }) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [code, setCode] = useState("// Start coding here\n");
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const loadChallenge = useCallback(async () => {
    try {
      const res = await fetch(`/api/challenge-links/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { reason?: string }).reason || "Challenge not found");
      }
      const data: ChallengeData = await res.json();
      setChallenge(data);
      if (data.session.languages.length > 0) {
        setLanguage(data.session.languages[0].toLowerCase());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load challenge");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/challenge-links/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to submit code");
      }

      const data = await res.json();
      setSuccess("Code submitted successfully!");

      // Add to submissions list
      setSubmissions((prev) => [
        {
          id: (data as { id?: string }).id || "unknown",
          code,
          language,
          submitted_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Reset code
      setCode("// Start coding here\n");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Challenge Not Found</h1>
          <p className="text-gray-600">{error || "The challenge link is invalid or expired"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{challenge.jobDescription.title}</h1>
              <p className="text-gray-600 text-sm mt-1">Candidate: {challenge.candidate.name}</p>
            </div>
            <div className="flex gap-2">
              <select title="Language" name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
                {challenge.session.languages.map((lang) => (
                  <option key={lang} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Problem Statement */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 h-fit sticky top-24">
            <h2 className="text-lg font-bold mb-4">Problem Statement</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{challenge.jobDescription.description}</p>
            </div>

            {challenge.jobDescription.required_skills && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.jobDescription.required_skills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {challenge.jobDescription.tech_stack && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.jobDescription.tech_stack.map((tech) => (
                    <Badge key={tech} className="bg-blue-100 text-blue-700">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            {error && <div className="bg-red-100 text-red-700 p-3 text-sm border-b border-red-200">{error}</div>}
            {success && <div className="bg-green-100 text-green-700 p-3 text-sm border-b border-green-200">{success}</div>}

            <div className="flex-1 min-h-96">
              <MonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          </div>
        </div>

        {/* Submissions History */}
        {submissions.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Submission History</h2>
            <div className="space-y-4">
              {submissions.map((sub, idx) => (
                <div key={sub.id} className="border border-gray-200 rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Submission #{submissions.length - idx}</span>
                    <span className="text-xs text-gray-500">{new Date(sub.submitted_at).toLocaleString()}</span>
                  </div>
                  <Badge className="bg-gray-100 text-gray-700 text-xs capitalize">{sub.language}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
