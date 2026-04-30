'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/library', label: 'Library', icon: '📚' },
  { href: '/sessions', label: 'Sessions', icon: '🎯' },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="font-bold text-lg tracking-tight">FE Interview</h1>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{userEmail}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full text-slate-300 hover:text-white">
          Sign out
        </Button>
      </div>
    </aside>
  )
}
