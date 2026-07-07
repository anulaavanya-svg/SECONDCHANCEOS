import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { ToastProvider } from '@/components/ui/Notification'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession()
  if (!session?.user) redirect('/login')

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  })

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar name={session.user.name} role={session.user.role} orgName={org?.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar title={org?.name} />
          <main className="flex-1 overflow-y-auto scroll-thin">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}
