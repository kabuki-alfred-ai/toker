import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicEndpoint: string | null

  constructor(private readonly config: ConfigService) {
    const endpoint = config.getOrThrow<string>('STORAGE_ENDPOINT')
    this.s3 = new S3Client({
      endpoint,
      region: config.get<string>('STORAGE_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_KEY'),
      },
      forcePathStyle: true,
    })
    this.bucket = config.getOrThrow<string>('STORAGE_BUCKET')
    // Optional public URL — used when presigned URLs must be reachable from external services (e.g. Replicate)
    this.publicEndpoint = config.get<string>('STORAGE_PUBLIC_URL') ?? null
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }))
      this.logger.log(`Bucket "${this.bucket}" ready`)
    } catch (err: unknown) {
      const code = (err as { Code?: string; name?: string })?.Code ?? (err as { name?: string })?.name
      if (code === 'NoSuchBucket' || code === '404' || code === 'NotFound') {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }))
        this.logger.log(`Bucket "${this.bucket}" created`)
      } else {
        this.logger.warn(`Could not verify bucket "${this.bucket}": ${String(err)} — uploads will fail until RustFS is reachable`)
      }
    }
  }

  /**
   * Downloads a file from a remote URL and uploads it to RustFS.
   * Returns the storage key (bucket path).
   */
  async uploadFromUrl(key: string, url: string, contentType: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch remote file (${response.status}): ${url}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    this.logger.log(`Stored ${key} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
    return key
  }

  async uploadFromBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: contentType }))
    this.logger.log(`Stored ${key} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
    return key
  }

  /**
   * Generates a presigned GET URL. Pass `publiclyAccessible: true` to rewrite
   * the host to STORAGE_PUBLIC_URL so external services (e.g. Replicate) can reach it.
   */
  async getPresignedUrl(key: string, expiresIn = 3600, publiclyAccessible = false): Promise<string> {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    )
    if (publiclyAccessible && this.publicEndpoint) {
      const internalEndpoint = this.config.getOrThrow<string>('STORAGE_ENDPOINT')
      return url.replace(internalEndpoint, this.publicEndpoint.replace(/\/$/, ''))
    }
    return url
  }

  /**
   * Checks whether a key exists in the bucket.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }
}
