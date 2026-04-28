import { redirect } from "next/navigation"
import type { ReactNode } from "react"

import { Header } from "@/components/dashboard/header"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Sidebar } from "@/components/dashboard/sidebar"
import { createClient } from "@/lib/supabase/server"

function getDisplayName(email: string) {
  return email.split("@")[0] || "User"
}

function getInitials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DU"
  )
}

interface AppShellProps {
  children: ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/")
  }

  const userEmail = claims.email ?? "No email available"
  const userName = getDisplayName(userEmail)
  const initials = getInitials(userName)

  async function signOut() {
    "use server"

    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        initials={initials}
        signOutAction={signOut}
        userEmail={userEmail}
        userName={userName}
      />

      <main className="flex-1 min-w-0">
        <Header initials={initials} userName={userName} />
        <div className="px-4 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
