"use client";

import { useParams } from "next/navigation";
import { PublicChallengeClient } from "@/components/challenge/PublicChallengeClient";

export default function ChallengePage() {
  const params = useParams();
  const token = params?.token as string;

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Challenge</h1>
          <p className="text-gray-600">No challenge token provided.</p>
        </div>
      </div>
    );
  }

  return <PublicChallengeClient token={token} />;
}
