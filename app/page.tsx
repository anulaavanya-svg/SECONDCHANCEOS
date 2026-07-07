import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/rbac'
import { ROLE_HOME } from '@/lib/auth'

export default async function Home() {
  const session = await getCurrentSession()
  if (!session?.user) redirect('/login')
  redirect(ROLE_HOME[session.user.role] ?? '/login')
}
