"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function SaveToLibraryButton({ sessionId, questionCount, challengeCount }: { sessionId: string; questionCount: number; challengeCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const unsavedQ = questionCount;
  const unsavedC = challengeCount;
  if (unsavedQ === 0 && unsavedC === 0) {
    return <span className="text-xs text-slate-400 italic">All saved to library</span>;
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/save-to-library`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast(`Saved ${data.savedQuestions} questions and ${data.savedChallenges} challenges to library`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSave} disabled={loading} variant="secondary" size="sm">
      {loading ? "Saving…" : `Save to Library (${unsavedQ}Q + ${unsavedC}C)`}
    </Button>
  );
}
