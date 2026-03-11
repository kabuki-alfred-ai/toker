import Link from 'next/link'
import { Wallet } from 'lucide-react'

interface CreditsBadgeProps {
  balance: number
}

export function CreditsBadge({ balance }: CreditsBadgeProps) {
  const statusColor =
    balance === 0 ? 'text-destructive' : balance <= 2 ? 'text-amber-500' : 'text-emerald-500'

  return (
    <Link
      href="/credits"
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-transparent hover:border-primary/20 no-underline transition-colors group"
    >
      <Wallet size={16} className={statusColor} />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-0.5">Crédits</span>
        <span className="text-sm font-bold text-foreground leading-none">
          {balance}
        </span>
      </div>
    </Link>
  )
}
