"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/library", label: "Library", icon: "📚" },
  { href: "/sessions", label: "Sessions", icon: "🎯" },
];

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className={cn("bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-56")}>
      <div className="px-4 py-5 border-b border-slate-700 flex items-center justify-between gap-2">
        <div className={cn("overflow-hidden", collapsed && "hidden")}>
          <h1 className="font-bold text-lg tracking-tight whitespace-nowrap">FE Interview</h1>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{userEmail}</p>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="text-lg">{collapsed ? "▶" : "◀"}</span>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname.startsWith(item.href) ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
            title={collapsed ? item.label : undefined}
          >
            <span>{item.icon}</span>
            <span className={cn(collapsed && "hidden")}>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className={cn("w-full text-slate-300 hover:text-white", collapsed && "px-1")} title={collapsed ? "Sign out" : undefined}>
          {collapsed ? "⊗" : "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
