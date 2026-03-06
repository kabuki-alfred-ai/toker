import Link from 'next/link'
import { Wallet } from 'lucide-react'

interface CreditsBadgeProps {
  balance: number
}

export function CreditsBadge({ balance }: CreditsBadgeProps) {
  const color =
    balance === 0 ? '#EF4444' : balance <= 2 ? '#F59E0B' : '#22C55E'

  return (
    <Link
      href="/credits"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 7,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}30`,
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.borderColor = `${color}55`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
        e.currentTarget.style.borderColor = `${color}30`
      }}
    >
      <Wallet size={14} color={color} strokeWidth={1.8} />
      <span style={{ fontSize: 13, color, fontWeight: 600 }}>
        {balance} crédit{balance !== 1 ? 's' : ''}
      </span>
    </Link>
  )
}
