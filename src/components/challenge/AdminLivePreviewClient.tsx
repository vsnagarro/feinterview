"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PublicChallengeClient } from "./PublicChallengeClient";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

interface AdminLivePreviewClientProps {
  linkId: string;
  linkToken: string;
  candidateName: string | null;
  sessionId: string;
  expiresAt: string;
  isExpired: boolean;
}

export function AdminLivePreviewClient({ linkToken, candidateName, sessionId, isExpired }: AdminLivePreviewClientProps) {
  const [copied, setCopied] = useState(false);

  const shareableLink = typeof window !== "undefined" ? `${window.location.origin}/challenge/${linkToken}` : `https://yourapp.com/challenge/${linkToken}`;

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    toast("Link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  }, [shareableLink]);

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Mini header with session info and copy button */}
      <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/sessions/${sessionId}`} className="text-sm text-slate-400 hover:text-cyan-300">
            ← Back to session
          </Link>
          {candidateName && (
            <span className="text-sm text-slate-300">
              Candidate: <span className="font-semibold text-white">{candidateName}</span>
            </span>
          )}
          <Badge variant={isExpired ? "danger" : "success"}>{isExpired ? "Expired" : `Active`}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={shareableLink} readOnly className="hidden sm:block px-3 py-1 text-xs bg-slate-900 border border-white/10 rounded text-slate-300" />
          <Button size="sm" onClick={handleCopyLink} className="whitespace-nowrap">
            {copied ? "✓ Copied" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* Challenge view with full-screen layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PublicChallengeClient token={linkToken} />
      </div>
    </div>
  );
}
