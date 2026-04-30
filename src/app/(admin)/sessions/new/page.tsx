import { SessionForm } from '@/components/admin/SessionForm'

export default function NewSessionPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New Interview Session</h1>
        <p className="text-slate-500 text-sm mt-1">Enter candidate and role details to generate tailored questions</p>
      </div>
      <SessionForm />
    </div>
  )
}
