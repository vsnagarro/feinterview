"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseCodeSyncOptions {
  linkId?: string;
  onConnected?: () => void;
  onCodeUpdate?: (code: string, language: string) => void;
}

export function useCodeSync({ linkId, onConnected, onCodeUpdate }: UseCodeSyncOptions) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!linkId) return;

    const channel = supabase.channel(`challenge:${linkId}`);
    channelRef.current = channel;

    // Listen for incoming code updates (e.g., from admin or other users)
    channel
      .on("broadcast", { event: "code_update" }, ({ payload }) => {
        onCodeUpdate?.(payload.code, payload.language);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onConnected?.();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId, supabase, onConnected, onCodeUpdate]);

  const syncCode = useCallback(
    (code: string, language: string) => {
      if (!linkId) return;

      // Broadcast immediately (ephemeral, <100ms to admin)
      if (broadcastDebounceRef.current) clearTimeout(broadcastDebounceRef.current);
      broadcastDebounceRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: "broadcast",
          event: "code_update",
          payload: { code, language },
        });
      }, 300);

      // Persist to DB (debounced 2s for reconnect recovery)
      if (dbDebounceRef.current) clearTimeout(dbDebounceRef.current);
      dbDebounceRef.current = setTimeout(async () => {
        await supabase.from("live_code_state").upsert({
          link_id: linkId,
          code,
          language,
          updated_at: new Date().toISOString(),
        });
      }, 2000);
    },
    [linkId, supabase],
  );

  return { syncCode };
}
