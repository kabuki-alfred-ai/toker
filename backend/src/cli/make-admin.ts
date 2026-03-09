import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as readline from 'readline'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r))

async function main() {
  const email = await ask('Email of the user to promote to ADMIN: ')

  const user = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!user) {
    console.error(`\nNo user found with email "${email.trim()}"`)
    process.exit(1)
  }

  if (user.role === 'ADMIN') {
    console.log(`\n${user.email} is already ADMIN.`)
    process.exit(0)
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'no name'
  const confirm = await ask(`\nPromote "${user.email}" (${displayName}) to ADMIN? (y/N): `)
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('Cancelled.')
    process.exit(0)
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } })
  console.log(`\n${user.email} is now ADMIN. They need to re-login to get a new JWT.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { rl.close(); prisma.$disconnect() })
