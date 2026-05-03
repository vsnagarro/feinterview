import { createClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/admin/SessionForm";
import type { InterviewProfile } from "@/types/app";

interface Props {
  searchParams: Promise<{ profileId?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { profileId } = await searchParams;
  let profile: InterviewProfile | undefined;

  if (profileId) {
    const supabase = await createClient();
    const { data } = await supabase.from("interview_profiles").select("*").eq("id", profileId).single();
    profile = (data as InterviewProfile) ?? undefined;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Interview Session</h1>
        <p className="text-slate-500 text-sm mt-1">{profile ? `Using profile: ${profile.title}` : "Enter candidate and role details to generate tailored questions"}</p>
      </div>
      <SessionForm profile={profile} />
    </div>
  );
}
