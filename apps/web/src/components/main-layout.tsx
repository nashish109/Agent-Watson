"use client"

import { Sidebar } from "@/components/sidebar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-dvh">
      <Sidebar className="hidden md:flex" />
      <div className="relative flex flex-1 flex-col">
        <MobileHeader />
        {children}
      </div>
    </div>
  )
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-center border-b border-border/50 px-4 py-3 md:hidden">
      <span className="text-sm font-medium text-muted-foreground/50">
        Watson
      </span>
    </header>
  )
}
