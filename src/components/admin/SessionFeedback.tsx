"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";

interface SessionFeedbackProps {
  sessionId: string;
  initialFeedback: string | null;
  screenshotPath: string | null;
  screenshotSignedUrl: string | null;
}

export function SessionFeedback({ sessionId, initialFeedback, screenshotPath, screenshotSignedUrl }: SessionFeedbackProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [deletingScreenshot, setDeletingScreenshot] = useState(false);
  const [currentScreenshotUrl, setCurrentScreenshotUrl] = useState<string | null>(screenshotSignedUrl);
  const [hasScreenshot, setHasScreenshot] = useState(!!screenshotPath);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveFeedback() {
    setSavingFeedback(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Feedback saved", "success");
      router.refresh();
    } catch {
      toast("Error saving feedback", "error");
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/sessions/${sessionId}/screenshot`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");

      // Show preview from local blob URL while page re-renders
      setCurrentScreenshotUrl(URL.createObjectURL(file));
      setHasScreenshot(true);
      toast("Screenshot uploaded", "success");
      router.refresh();
    } catch {
      toast("Error uploading screenshot", "error");
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteScreenshot() {
    if (!confirm("Remove screenshot?")) return;
    setDeletingScreenshot(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/screenshot`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setCurrentScreenshotUrl(null);
      setHasScreenshot(false);
      toast("Screenshot removed", "success");
      router.refresh();
    } catch {
      toast("Error removing screenshot", "error");
    } finally {
      setDeletingScreenshot(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Feedback */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Interviewer Feedback</h3>
        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Add your notes and feedback about the candidate's performance…" />
        <Button size="sm" className="mt-2" loading={savingFeedback} onClick={handleSaveFeedback}>
          Save Feedback
        </Button>
      </div>

      {/* Screenshot */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Screenshot / Reference Image</h3>
        {currentScreenshotUrl && (
          <div className="mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentScreenshotUrl} alt="Session screenshot" className="max-w-full rounded-lg border border-slate-200 shadow-sm max-h-96 object-contain" />
            <button onClick={handleDeleteScreenshot} disabled={deletingScreenshot} className="mt-2 text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
              {deletingScreenshot ? "Removing…" : "Remove screenshot"}
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleScreenshotUpload} className="hidden" id={`screenshot-upload-${sessionId}`} />
          <label
            htmlFor={`screenshot-upload-${sessionId}`}
            className={`cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors ${uploadingScreenshot ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploadingScreenshot ? "Uploading…" : hasScreenshot ? "Replace screenshot" : "Upload screenshot"}
          </label>
          <span className="text-xs text-slate-400">PNG, JPG, WEBP up to 10MB</span>
        </div>
      </div>
    </div>
  );
}
