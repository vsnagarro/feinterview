"use client";

import { PublicChallengeClient } from "@/components/challenge/PublicChallengeClient";

type Props = { token: string };

export default function ChallengeClient({ token }: Props) {
  return <PublicChallengeClient token={token} />;
}
