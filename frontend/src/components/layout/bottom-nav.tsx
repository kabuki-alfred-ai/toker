'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Search, Download, Subtitles, Wallet, Captions } from 'lucide-react'
import { cn } from '@/lib/utils'
import FloatingActionMenu from '@/components/ui/floating-action-menu'

const FEATURE_ITEMS = [
  { href: '/transcriptions', label: 'Transcrire', icon: FileText },
  { href: '/source-finder', label: 'Source', icon: Search },
  { href: '/download', label: 'Télécharger', icon: Download },
  { href: '/subtitle-remover', label: 'Retirer sous-titres', icon: Subtitles },
  { href: '/subtitle-generator', label: 'Générer sous-titres', icon: Captions },
]

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 no-underline transition-all duration-200 flex-1 py-1",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <div className={cn(
        "flex flex-col items-center justify-center p-[4px] rounded-full",
        isActive ? "bg-primary/10" : "bg-transparent"
      )}>
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive ? "animate-in zoom-in-75 duration-300" : "")} />
      </div>
      <span className={cn("text-[9px] truncate w-full text-center px-0.5", isActive ? "font-bold" : "font-medium")}>
        {label}
      </span>
    </Link>
  )
}

export function BottomNav() {
  const router = useRouter()

  const featureOptions = FEATURE_ITEMS.map(({ href, label, icon: Icon }) => ({
    label,
    onClick: () => router.push(href),
    Icon: <Icon size={20} />,
  }))

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(60px+env(safe-area-inset-bottom))] bg-card/90 border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom)] z-[100] backdrop-blur-lg px-6"
    >
      <NavItem href="/dashboard" label="Dashboard" icon={LayoutDashboard} />

      <div className="flex-1 flex justify-center items-center">
        <FloatingActionMenu options={featureOptions} />
      </div>

      <NavItem href="/credits" label="Crédits" icon={Wallet} />
    </nav>
  )
}
