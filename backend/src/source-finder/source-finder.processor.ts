import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const execa = require('execa') as (file: string, args: string[], opts?: object) => Promise<{ stdout: string; stderr: string }>
import { PrismaService } from '../common/prisma/prisma.service'
import { SOURCE_FINDER_QUEUE } from './source-finder.constants'
import { GeminiSourceFinderService } from './gemini-source-finder.service'

export interface FindSourcesJobData {
  searchId: string
  videoUrl: string
  userId: string
}

export interface SourceResult {
  url: string
  title: string
  thumbnailUrl: string | null
  timestamp: number
  confidence: number
  type: 'visual'
}

interface ScriptSource {
  url: string
  title: string
  platform: string
  thumbnailUrl: string | null
  score: number
}

interface ScriptScene {
  index: number
  frameUrl: string | null
  sources: ScriptSource[]
}

interface ScriptOutput {
  scenes: ScriptScene[]
  total_scenes: number
}

@Processor(SOURCE_FINDER_QUEUE)
export class SourceFinderProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceFinderProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly geminiService: GeminiSourceFinderService,
  ) {
    super()
  }

  async process(job: Job<FindSourcesJobData>): Promise<void> {
    const { searchId, videoUrl, userId } = job.data
    this.logger.log(`Processing source-finder job ${job.id} for search ${searchId}`)

    try {
      await this.prisma.sourceSearch.update({
        where: { id: searchId },
        data: { status: 'PROCESSING' },
      })

      // Use Gemini strategy when GEMINI_API_KEY is configured
      if (process.env.GEMINI_API_KEY) {
        this.logger.log(`Using Gemini strategy for ${videoUrl}`)
        const { analysis, results } = await this.geminiService.findSources(videoUrl)

        await this.prisma.sourceSearch.update({
          where: { id: searchId },
          data: {
            status: 'COMPLETED',
            sources: { strategy: 'gemini', analysis, results } as object,
          },
        })

        this.logger.log(
          `Source search ${searchId} completed via Gemini — ${results.length} results (isRemix: ${analysis.isRemix})`,
        )
        return
      }

      // Fallback: Python script (OpenCV + Google Lens)
      const python = this.config.get<string>('FIND_SOURCES_PYTHON') ?? 'python3'
      const script = this.config.get<string>('FIND_SOURCES_SCRIPT')
      if (!script) throw new Error('FIND_SOURCES_SCRIPT not configured')

      this.logger.log(`Running find_sources.py for ${videoUrl}`)

      const { stdout, stderr } = await execa(python, [script, videoUrl], {
        timeout: 5 * 60 * 1000, // 5 min max
      })

      // Log Python stderr (progress messages) for debugging
      if (stderr) {
        for (const line of stderr.split('\n').filter(Boolean)) {
          this.logger.log(`[py] ${line}`)
        }
      }

      this.logger.log(`Script stdout (first 300 chars): ${stdout.slice(0, 300)}`)

      let output: ScriptOutput
      try {
        output = JSON.parse(stdout)
      } catch {
        throw new Error(`Script output is not valid JSON: ${stdout.slice(0, 200)}`)
      }

      const scenes = output.scenes ?? []
      const totalSources = scenes.reduce((acc, s) => acc + (s.sources?.length ?? 0), 0)
      this.logger.log(`Script found ${scenes.length} scenes, ${totalSources} total sources`)

      await this.prisma.sourceSearch.update({
        where: { id: searchId },
        data: { status: 'COMPLETED', sources: scenes as object[] },
      })

      this.logger.log(`Source search ${searchId} completed — ${scenes.length} scenes, ${totalSources} sources`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Source search ${searchId} failed: ${errorMsg}`)

      await this.prisma.$transaction([
        this.prisma.sourceSearch.update({
          where: { id: searchId },
          data: { status: 'FAILED', errorMsg },
        }),
        this.prisma.creditWallet.update({
          where: { userId },
          data: { balance: { increment: 1 } },
        }),
        this.prisma.creditTransaction.create({
          data: { userId, amount: 1, reason: 'SOURCE_FINDER_REFUND', description: videoUrl },
        }),
      ])
    }
  }
}
