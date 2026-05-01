"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, WORKSPACE_TEMPLATE_LABELS, type WorkspaceTemplate } from "@/types/app";
import { timeUntil, isExpired } from "@/lib/utils";
import Link from "next/link";

const PACKAGE_PRESETS = [
  {
    id: "react-ui",
    label: "React UI",
    templates: ["react"] as WorkspaceTemplate[],
    dependencies: {
      "framer-motion": "11",
      "lucide-react": "0.469.0",
      clsx: "2",
    },
  },
  {
    id: "data-fetching",
    label: "Data Fetching",
    templates: ["react", "vanilla", "tailwind"] as WorkspaceTemplate[],
    dependencies: {
      "@tanstack/react-query": "5",
      axios: "1",
      zod: "3",
    },
  },
  {
    id: "charts",
    label: "Charts",
    templates: ["react", "vanilla", "tailwind"] as WorkspaceTemplate[],
    dependencies: {
      recharts: "2",
      d3: "7",
      dayjs: "1",
    },
  },
  {
    id: "state-management",
    label: "State Management",
    templates: ["react"] as WorkspaceTemplate[],
    dependencies: {
      zustand: "4",
      jotai: "2",
      immer: "10",
    },
  },
  {
    id: "tailwind-ui",
    label: "Tailwind UI",
    templates: ["tailwind"] as WorkspaceTemplate[],
    dependencies: {
      clsx: "2",
      "class-variance-authority": "0.7",
      tailwindcss: "3",
    },
  },
  {
    id: "vanilla-utils",
    label: "Vanilla Utilities",
    templates: ["vanilla"] as WorkspaceTemplate[],
    dependencies: {
      lodash: "4",
      dayjs: "1",
      nanoid: "5",
    },
  },
] as const;

type PackagePresetId = (typeof PACKAGE_PRESETS)[number]["id"];

function parseSandboxDependencies(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((dependencies, line) => {
      const separatorIndex = line.lastIndexOf("@");
      if (separatorIndex > 0) {
        const name = line.slice(0, separatorIndex).trim();
        const version = line.slice(separatorIndex + 1).trim();
        if (name && version) {
          dependencies[name] = version;
          return dependencies;
        }
      }

      dependencies[line] = "latest";
      return dependencies;
    }, {});
}

function stringifyDependencies(dependencies: Record<string, string>) {
  return Object.entries(dependencies)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `${name}@${version}`)
    .join("\n");
}

interface ChallengeLink {
  id: string;
  token: string;
  url: string;
  expires_at: string;
  is_active: boolean;
  candidate_name: string | null;
  opened_at: string | null;
}

interface ChallengeLinkGeneratorProps {
  sessionId: string;
  existingChallenge?: {
    id: string;
    title: string;
    links: ChallengeLink[];
  };
}

export function ChallengeLinkGenerator({ sessionId, existingChallenge }: ChallengeLinkGeneratorProps) {
  const [challenge, setChallenge] = useState(existingChallenge ?? null);
  const [links, setLinks] = useState<ChallengeLink[]>(existingChallenge?.links ?? []);
  const [showChallengeForm, setShowChallengeForm] = useState(!existingChallenge);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PackagePresetId>(PACKAGE_PRESETS[0].id);

  const [challengeForm, setChallengeForm] = useState({
    title: "",
    problemStatement: "",
    useCase: "",
    requirements: "",
    workspaceTemplate: "react" as WorkspaceTemplate,
    npmPackages: "",
    starterCode: "",
    supportedLanguages: ["javascript", "typescript"] as string[],
    timeLimitMinutes: "",
  });

  const recommendedPresets = useMemo(() => PACKAGE_PRESETS.filter((preset) => preset.templates.includes(challengeForm.workspaceTemplate)), [challengeForm.workspaceTemplate]);

  const availablePresets = useMemo(() => {
    const ids = new Set(recommendedPresets.map((preset) => preset.id));
    return [...recommendedPresets, ...PACKAGE_PRESETS.filter((preset) => !ids.has(preset.id))];
  }, [recommendedPresets]);

  const [linkForm, setLinkForm] = useState({
    candidateName: "",
    hoursValid: "24",
  });

  useEffect(() => {
    if (recommendedPresets.length > 0) {
      setSelectedPreset(recommendedPresets[0].id);
    }
  }, [recommendedPresets]);

  function toggleLanguage(lang: string) {
    setChallengeForm((prev) => ({
      ...prev,
      supportedLanguages: prev.supportedLanguages.includes(lang) ? prev.supportedLanguages.filter((l) => l !== lang) : [...prev.supportedLanguages, lang],
    }));
  }

  function applyPreset(presetId: string) {
    const preset = PACKAGE_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;

    const current = parseSandboxDependencies(challengeForm.npmPackages);
    const merged = {
      ...current,
      ...preset.dependencies,
    };

    setChallengeForm((prev) => ({
      ...prev,
      npmPackages: stringifyDependencies(merged),
    }));

    toast(`Added ${preset.label} preset`, "success");
  }

  function clearPackages() {
    setChallengeForm((prev) => ({
      ...prev,
      npmPackages: "",
    }));
  }

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          title: challengeForm.title,
          problemStatement: challengeForm.problemStatement,
          useCase: challengeForm.useCase,
          requirements: challengeForm.requirements
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          workspaceTemplate: challengeForm.workspaceTemplate,
          sandboxDependencies: parseSandboxDependencies(challengeForm.npmPackages),
          starterCode: challengeForm.starterCode || undefined,
          supportedLanguages: challengeForm.supportedLanguages,
          timeLimitMinutes: Number(challengeForm.timeLimitMinutes) || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create challenge");
      const data = await res.json();
      setChallenge({ id: data.id, title: data.title, links: [] });
      setShowChallengeForm(false);
      toast("Challenge created", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateLink(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setSaving(true);

    const expiresAt = new Date(Date.now() + Number(linkForm.hoursValid) * 3_600_000).toISOString();

    try {
      const res = await fetch(`/api/challenges/${challenge.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt,
          candidateName: linkForm.candidateName || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      setLinks((prev) => [{ ...data, url: data.url }, ...prev]);
      setShowLinkForm(false);
      setLinkForm({ candidateName: "", hoursValid: "24" });
      toast("Link generated!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", "error");
    } finally {
      setSaving(false);
    }
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast("Link copied to clipboard", "success");
  }

  return (
    <div className="space-y-4">
      {/* Challenge setup */}
      {showChallengeForm && (
        <form onSubmit={handleCreateChallenge} className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Create Code Challenge</h3>
          <Input label="Title" value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} placeholder="Implement a debounce function" required />
          <Textarea
            label="Problem statement"
            value={challengeForm.problemStatement}
            onChange={(e) => setChallengeForm({ ...challengeForm, problemStatement: e.target.value })}
            rows={5}
            placeholder="Write a detailed problem statement…"
            required
          />
          <Textarea
            label="Use case"
            value={challengeForm.useCase}
            onChange={(e) => setChallengeForm({ ...challengeForm, useCase: e.target.value })}
            rows={3}
            placeholder="Explain where this task fits in a real product or UI flow…"
          />
          <Textarea
            label="Requirements (one per line)"
            value={challengeForm.requirements}
            onChange={(e) => setChallengeForm({ ...challengeForm, requirements: e.target.value })}
            rows={4}
            placeholder={"Implement keyboard navigation\nHandle loading state\nKeep the API response cached"}
          />
          <Select
            label="Workspace preset"
            value={challengeForm.workspaceTemplate}
            onChange={(e) => setChallengeForm({ ...challengeForm, workspaceTemplate: e.target.value as WorkspaceTemplate })}
            options={Object.entries(WORKSPACE_TEMPLATE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <Textarea
            label="Extra npm packages (one per line)"
            value={challengeForm.npmPackages}
            onChange={(e) => setChallengeForm({ ...challengeForm, npmPackages: e.target.value })}
            rows={4}
            placeholder={"lodash\nframer-motion@11.0.0\n@tanstack/react-query@5"}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Package presets</p>
            {recommendedPresets.length > 0 && (
              <p className="text-xs text-slate-600">
                Recommended for {WORKSPACE_TEMPLATE_LABELS[challengeForm.workspaceTemplate]}: {recommendedPresets.map((preset) => preset.label).join(", ")}
              </p>
            )}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <Select
                label="Preset"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value as PackagePresetId)}
                options={availablePresets.map((preset) => ({ value: preset.id, label: preset.label }))}
              />
              <Button type="button" variant="secondary" onClick={() => applyPreset(selectedPreset)}>
                Add preset
              </Button>
              <Button type="button" variant="ghost" onClick={() => recommendedPresets[0] && applyPreset(recommendedPresets[0].id)} disabled={recommendedPresets.length === 0}>
                Add recommended
              </Button>
              <Button type="button" variant="ghost" onClick={clearPackages}>
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-full border bg-white px-3 py-1 text-xs transition-colors ${
                    preset.templates.includes(challengeForm.workspaceTemplate)
                      ? "border-sky-300 text-sky-700 hover:border-sky-500"
                      : "border-slate-300 text-slate-600 hover:border-sky-400 hover:text-sky-700"
                  }`}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Starter code (optional)"
            value={challengeForm.starterCode}
            onChange={(e) => setChallengeForm({ ...challengeForm, starterCode: e.target.value })}
            rows={4}
            placeholder="// Your implementation here..."
          />
          <div>
            <p className="label mb-2">Supported languages</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    challengeForm.supportedLanguages.includes(lang) ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-600 border-slate-300 hover:border-sky-400"
                  }`}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Time limit (minutes, optional)"
            type="number"
            value={challengeForm.timeLimitMinutes}
            onChange={(e) => setChallengeForm({ ...challengeForm, timeLimitMinutes: e.target.value })}
            placeholder="45"
            min="5"
          />
          <Button type="submit" loading={saving}>
            Create Challenge
          </Button>
        </form>
      )}

      {/* Existing challenge */}
      {challenge && !showChallengeForm && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{challenge.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">Code challenge configured</p>
            </div>
            <Button size="sm" onClick={() => setShowLinkForm(!showLinkForm)}>
              {showLinkForm ? "Cancel" : "+ Generate link"}
            </Button>
          </div>

          {showLinkForm && (
            <form onSubmit={handleGenerateLink} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Candidate name (optional)" value={linkForm.candidateName} onChange={(e) => setLinkForm({ ...linkForm, candidateName: e.target.value })} placeholder="Jane Doe" />
                <Input label="Valid for (hours)" type="number" value={linkForm.hoursValid} onChange={(e) => setLinkForm({ ...linkForm, hoursValid: e.target.value })} min="1" max="168" required />
              </div>
              <Button type="submit" size="sm" loading={saving}>
                Generate shareable link
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Generated links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => {
            const expired = isExpired(link.expires_at);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
            const url = link.url ?? `${appUrl}/challenge/${link.token}`;
            return (
              <div key={link.id} className={`card p-4 ${expired ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {link.candidate_name && <p className="text-sm font-medium text-slate-900 mb-1">{link.candidate_name}</p>}
                    <p className="text-xs text-slate-500 truncate font-mono">{url}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={expired ? "danger" : "success"}>{expired ? "Expired" : `Expires in ${timeUntil(link.expires_at)}`}</Badge>
                      {link.opened_at && <Badge variant="info">Opened</Badge>}
                      {!link.is_active && <Badge variant="danger">Deactivated</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => copyLink(url, link.id)}>
                      {copiedId === link.id ? "Copied!" : "Copy"}
                    </Button>
                    {!expired && (
                      <Link href={`/sessions/${sessionId}/challenge/${link.id}`}>
                        <Button size="sm">Live view</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!challenge && !showChallengeForm && (
        <Button variant="secondary" onClick={() => setShowChallengeForm(true)}>
          + Add code challenge
        </Button>
      )}
    </div>
  );
}
