/**
 * init-storage.ts
 * Initialise les buckets RustFS/S3 nécessaires au démarrage en production.
 * Usage : npx ts-node src/cli/init-storage.ts
 * Ou via npm : npm run storage:init --workspace=backend
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3'

config({ path: resolve(__dirname, '../../../.env') })
config({ path: resolve(__dirname, '../../.env') })

const REQUIRED_BUCKETS = [
  process.env.STORAGE_BUCKET ?? 'viralscript',
]

async function main() {
  const endpoint = process.env.STORAGE_ENDPOINT
  const accessKeyId = process.env.STORAGE_ACCESS_KEY
  const secretAccessKey = process.env.STORAGE_SECRET_KEY
  const region = process.env.STORAGE_REGION ?? 'us-east-1'

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error('❌  Missing STORAGE_ENDPOINT, STORAGE_ACCESS_KEY or STORAGE_SECRET_KEY in .env')
    process.exit(1)
  }

  console.log(`🔗  Connecting to RustFS at ${endpoint}`)

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  for (const bucket of REQUIRED_BUCKETS) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }))
      console.log(`✔   Bucket "${bucket}" already exists`)
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }))
      console.log(`✅  Bucket "${bucket}" created`)
    }
  }

  console.log('\n✔   Storage initialised successfully')
}

main().catch((err) => {
  console.error('❌  Storage init failed:', err.message ?? err)
  process.exit(1)
})
