'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <button onClick={() => reset()}>Réessayer</button>
      </body>
    </html>
  )
}
