'use client'

import { FormEvent, Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@secondchance.com' },
  { role: 'Manager', email: 'dana.kowalski@secondchance.com' },
  { role: 'Employee', email: 'employee@secondchance.com' },
  { role: 'Researcher', email: 'researcher@secondchance.com' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password. Please try again.')
      return
    }
    router.push(searchParams.get('callbackUrl') ?? '/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
          2C
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">
          SecondChance<span className="text-accent">OS</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          The operating system for second-chance employment.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-white px-3 py-2 pr-16 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted hover:text-ink"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          New company?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-5 rounded-card border border-line bg-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Demo accounts — password: <span className="font-mono normal-case">password</span>
        </p>
        <div className="space-y-1">
          {DEMO_ACCOUNTS.map((acct) => (
            <button
              key={acct.email}
              type="button"
              onClick={() => {
                setEmail(acct.email)
                setPassword('password')
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-bg"
            >
              <span className="font-medium text-ink">{acct.role}</span>
              <span className="font-mono text-xs text-muted">{acct.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
