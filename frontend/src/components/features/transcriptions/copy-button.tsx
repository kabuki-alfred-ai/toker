'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      onClick={handleCopy}
      size="sm"
      variant={copied ? 'outline' : 'default'}
      className={cn(copied && 'text-emerald-600 border-emerald-300')}
    >
      {copied ? <Check size={14} className="mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
      {copied ? 'Copié !' : 'Copier tout'}
    </Button>
  )
}
