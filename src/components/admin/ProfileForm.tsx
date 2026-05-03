"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { InterviewProfile, Difficulty, GenerateType } from "@/types/app";

interface ProfileFormProps {
  /** Existing profile data when editing; undefined when creating */
  profile?: InterviewProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const isEdit = !!profile;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(profile?.title ?? "");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [level, setLevel] = useState<Difficulty>((profile?.level as Difficulty) ?? "mid");
  const [jdText, setJdText] = useState(profile?.jd_text ?? "");
  const [questionCount, setQuestionCount] = useState(String(profile?.question_count ?? 10));
  const [challengeCount, setChallengeCount] = useState(String(profile?.challenge_count ?? 3));
  const [trickiness, setTrickiness] = useState(String(profile?.trickiness ?? 3));
  const [difficulty, setDifficulty] = useState<Difficulty>((profile?.difficulty as Difficulty) ?? "mid");
  const [generateType, setGenerateType] = useState<GenerateType>(profile?.generate_type ?? "both");
  const [challengeGuideline, setChallengeGuideline] = useState(profile?.challenge_guideline ?? "");
  const [extraChecks, setExtraChecks] = useState(profile?.extra_checks ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [experienceRange, setExperienceRange] = useState(profile?.experience_range ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title,
        position,
        level,
        jd_text: jdText || null,
        question_count: Number(questionCount),
        challenge_count: Number(challengeCount),
        trickiness: Number(trickiness),
        difficulty,
        generate_type: generateType,
        challenge_guideline: challengeGuideline || null,
        extra_checks: extraChecks || null,
        notes: notes || null,
        experience_range: experienceRange || null,
      };

      const res = await fetch(isEdit ? `/api/profiles/${profile.id}` : "/api/profiles", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to save profile");
      }

      const saved = (await res.json()) as InterviewProfile;
      toast(isEdit ? "Profile updated" : "Profile created", "success");
      router.push(`/profiles/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Profile Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Profile name *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer Profile" required />
          <Input label="Position / Role" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Senior Frontend Engineer" />
        </div>
        <Input label="Experience range" value={experienceRange} onChange={(e) => setExperienceRange(e.target.value)} placeholder="3–5 years" />
        <Textarea label="Job description (paste full JD for best AI questions)" value={jdText} onChange={(e) => setJdText(e.target.value)} rows={8} placeholder="Paste the job description here…" />
        <Textarea label="Notes (internal — not sent to AI)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="E.g. used for React team hirings, focus on system design…" />
      </div>

      {/* Generation settings */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Default Generation Settings</h2>
        <p className="text-sm text-slate-500">These defaults are applied when starting a session from this profile. You can override them per-session.</p>
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value as Difficulty)}
            options={[
              { value: "junior", label: "Junior" },
              { value: "mid", label: "Mid-level" },
              { value: "senior", label: "Senior" },
            ]}
          />
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            options={[
              { value: "junior", label: "Junior" },
              { value: "mid", label: "Mid-level" },
              { value: "senior", label: "Senior" },
            ]}
          />
          <div>
            <label className="text-sm font-medium block mb-1">Trickiness (1–5)</label>
            <Input type="number" min={1} max={5} value={trickiness} onChange={(e) => setTrickiness(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Questions"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            options={["5", "8", "10", "12", "15", "20", "25", "30"].map((v) => ({ value: v, label: `${v} questions` }))}
          />
          <Select
            label="Code challenges"
            value={challengeCount}
            onChange={(e) => setChallengeCount(e.target.value)}
            options={["1", "2", "3", "5", "7", "10"].map((v) => ({ value: v, label: `${v} challenge${Number(v) !== 1 ? "s" : ""}` }))}
          />
          <Select
            label="Generate"
            value={generateType}
            onChange={(e) => setGenerateType(e.target.value as GenerateType)}
            options={[
              { value: "both", label: "Questions + Challenges" },
              { value: "questions", label: "Questions only" },
              { value: "challenges", label: "Code challenges only" },
            ]}
          />
        </div>
        <Input
          label="Challenge guideline (optional)"
          value={challengeGuideline}
          onChange={(e) => setChallengeGuideline(e.target.value)}
          placeholder="E.g. focus on algorithms, avoid DOM manipulation"
        />
        <div>
          <label className="text-sm font-medium block mb-1">Extra checks (one per line)</label>
          <Textarea
            value={extraChecks}
            onChange={(e) => setExtraChecks(e.target.value)}
            rows={3}
            placeholder="Performance&#10;Accessibility&#10;Edge cases"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "Save Changes" : "Create Profile"}
        </Button>
      </div>
    </form>
  );
}
