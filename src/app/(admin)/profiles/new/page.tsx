import { ProfileForm } from "@/components/admin/ProfileForm";

export default function NewProfilePage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Interview Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Define the job description, level, and generation settings. Add candidates to this profile to quickly start sessions.</p>
      </div>
      <ProfileForm />
    </div>
  );
}
