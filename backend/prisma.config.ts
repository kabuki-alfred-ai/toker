import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from root (monorepo) or backend directory
config({ path: resolve(__dirname, '../.env') })
config({ path: resolve(__dirname, '.env') }) // fallback
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
