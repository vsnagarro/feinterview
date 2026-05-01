"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

export function DeleteSessionButton({ sessionId, redirectTo }: { sessionId: string; redirectTo?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete session");
      }
      toast("Session deleted", "success");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
        <button onClick={handleDelete} disabled={loading} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
          {loading ? "Deleting…" : "Confirm"}
        </button>
        <button onClick={() => setConfirming(false)} disabled={loading} className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        setConfirming(true);
      }}
      className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  );
}
