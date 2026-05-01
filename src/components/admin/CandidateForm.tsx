"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CandidateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    experience_level: "Mid",
    skills: "",
    summary: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Get current user (for created_by_id)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const skills = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const { error: dbError } = await supabase
        .from("candidates")
        .insert({
          name: formData.name,
          email: formData.email || null,
          experience_level: formData.experience_level,
          skills,
          summary: formData.summary || null,
          created_by_id: user.id,
        })
        .select();

      if (dbError) throw dbError;

      setSuccess("Candidate created successfully!");
      setFormData({
        name: "",
        email: "",
        experience_level: "Mid",
        skills: "",
        summary: "",
      });

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Create Candidate</h2>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {success && <div className="p-4 bg-green-100 text-green-700 rounded">{success}</div>}

      <Input label="Name" name="name" value={formData.name} onChange={handleChange} required placeholder="Candidate name" />

      <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="candidate@example.com" />

      <Select
        label="Experience Level"
        name="experience_level"
        value={formData.experience_level}
        onChange={handleChange}
        options={[
          { value: "Junior", label: "Junior" },
          { value: "Mid", label: "Mid" },
          { value: "Senior", label: "Senior" },
        ]}
      />

      <Input label="Skills (comma-separated)" name="skills" value={formData.skills} onChange={handleChange} placeholder="React, TypeScript, Node.js" />

      <Textarea label="Summary" name="summary" value={formData.summary} onChange={handleChange} placeholder="Brief profile summary..." rows={4} />

      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Candidate"}
      </Button>
    </form>
  );
}
