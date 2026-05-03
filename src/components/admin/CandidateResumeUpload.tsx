"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FileText, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/Toast";

const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ALLOWED_EXT = /\.(pdf|doc|docx)$/i;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface Props {
  candidateId: string;
  currentResumeUrl: string | null;
  currentSignedUrl: string | null;
  uploadedAt: string | null;
}

export function CandidateResumeUpload({ candidateId, currentResumeUrl, currentSignedUrl, uploadedAt }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(currentSignedUrl);
  const [filename, setFilename] = useState<string | null>(currentResumeUrl ? (currentResumeUrl.split("/").pop() ?? null) : null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_EXT.test(file.name) && !ALLOWED_TYPES.includes(file.type)) {
      toast("Only PDF, DOC, or DOCX files are allowed", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast("File must be under 5 MB", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      // 1. Get signed upload URL
      const signRes = await fetch("/api/candidates/upload-resume/signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });

      if (signRes.status === 202) {
        // Fallback: multipart upload
        const fallback = await signRes.json().catch(() => ({}));
        const form = new FormData();
        form.append("file", file);
        form.append("candidateId", candidateId);
        const res = await fetch(fallback.fallbackUpload ?? "/api/candidates/upload-resume", { method: "POST", body: form });
        if (!res.ok) throw new Error("Upload failed");
        toast("Resume uploaded", "success");
        router.refresh();
        return;
      }

      if (!signRes.ok) throw new Error("Could not get upload URL");
      const { uploadUrl, filename: storedFilename } = await signRes.json();

      // 2. PUT directly to storage
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      // 3. Register with candidate record
      const regRes = await fetch("/api/candidates/register-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, filename: storedFilename }),
      });
      if (!regRes.ok) throw new Error("Failed to register upload");

      setFilename(storedFilename ?? file.name);
      setSignedUrl(null); // will be refreshed on next server render
      toast("Resume uploaded successfully", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Resume</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
            id={`resume-upload-${candidateId}`}
          />
          <label
            htmlFor={`resume-upload-${candidateId}`}
            className={`cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? "Uploading…" : filename ? "Replace Resume" : "Upload Resume"}
          </label>
        </div>
      </div>

      {filename ? (
        <div className="flex items-center justify-between gap-4 bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-800">{filename}</p>
              {uploadedAt && <p className="text-xs text-slate-400">Uploaded {uploadedAt}</p>}
            </div>
          </div>
          {signedUrl ? (
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary">
                <ExternalLink className="mr-2 h-4 w-4" /> View Resume
              </Button>
            </a>
          ) : (
            <span className="text-xs text-slate-400">Refresh page to preview</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4 text-sm text-slate-500 border-2 border-dashed border-slate-200">
          <FileText className="h-6 w-6 text-slate-500" />
          <div>
            <p className="font-medium text-slate-600">No resume uploaded yet</p>
            <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, or DOCX — max 5 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}
