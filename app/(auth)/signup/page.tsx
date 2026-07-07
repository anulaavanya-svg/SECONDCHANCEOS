'use client'

import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    orgName: '',
    industry: '',
    fullName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not create your account.')
      }
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error) throw new Error('Account created — please sign in.')
      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
            2C
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Create your company account</h1>
          <p className="mt-1 text-sm text-muted">
            Set up SecondChanceOS for your organization in under a minute.
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Company name" name="orgName" required value={form.orgName} onChange={set('orgName')} placeholder="Acme Manufacturing" />
            <Input label="Industry (optional)" name="industry" value={form.industry} onChange={set('industry')} placeholder="manufacturing" />
            <Input label="Your full name" name="fullName" required value={form.fullName} onChange={set('fullName')} placeholder="Jamie Rivera" />
            <Input label="Work email" name="email" type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
            <Input label="Password" name="password" type="password" required minLength={8} value={form.password} onChange={set('password')} placeholder="At least 8 characters" />

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
