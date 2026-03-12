import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { exec } from 'child_process'
import { promisify } from 'util'
import { GoogleGenerativeAI } from '@google/generative-ai'

const execAsync = promisify(exec)

export interface GeminiSourceResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  url: string
  publishedAt: string
  relevanceScore: number
  matchReason: string
}

export interface GeminiAnalysisResult {
  keywords: string[]
  searchQueries: string[]
  analysis: string
  isRemix: boolean
}

@Injectable()
export class GeminiSourceFinderService {
  private readonly logger = new Logger(GeminiSourceFinderService.name)
  private genAI: GoogleGenerativeAI | null = null

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
  }

  async findSources(videoUrl: string): Promise<{ analysis: GeminiAnalysisResult; results: GeminiSourceResult[] }> {
    // 1. Extract metadata via yt-dlp
    const metadata = await this.extractMetadata(videoUrl)

    // 2. Analyze with Gemini
    const analysis = await this.analyzeWithGemini(metadata)

    // 3. Search YouTube
    const results = await this.searchYouTube(analysis.searchQueries, analysis.keywords)

    return { analysis, results }
  }

  private async extractMetadata(videoUrl: string): Promise<Record<string, unknown>> {
    try {
      const { stdout } = await execAsync(`yt-dlp --dump-json --no-playlist "${videoUrl}"`, { timeout: 30000 })
      const data = JSON.parse(stdout) as {
        title?: string
        description?: string
        tags?: string[]
        uploader?: string
        channel?: string
        duration?: number
        view_count?: number
        like_count?: number
        upload_date?: string
        categories?: string[]
        subtitles?: Record<string, unknown>
      }
      return {
        title: data.title,
        description: data.description?.slice(0, 2000) ?? '',
        tags: data.tags?.slice(0, 20) ?? [],
        uploader: data.uploader,
        channel: data.channel,
        duration: data.duration,
        view_count: data.view_count,
        like_count: data.like_count,
        upload_date: data.upload_date,
        categories: data.categories ?? [],
        subtitles: data.subtitles ? Object.keys(data.subtitles) : [],
      }
    } catch (err) {
      this.logger.error('yt-dlp metadata extraction failed', err)
      throw new Error('Could not extract video metadata')
    }
  }

  private async analyzeWithGemini(metadata: Record<string, unknown>): Promise<GeminiAnalysisResult> {
    if (!this.genAI) {
      // Fallback: extract keywords from title/description without AI
      const title = String(metadata.title ?? '')
      const tags = (metadata.tags as string[]) ?? []
      return {
        keywords: [title, ...tags.slice(0, 5)].filter(Boolean),
        searchQueries: [title],
        analysis: 'Gemini not configured, using basic keyword extraction',
        isRemix: false,
      }
    }

    const modelName = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    const model = this.genAI.getGenerativeModel({ model: modelName })

    const prompt = `You are an expert at analyzing video metadata to identify if a video is a remix, reediting, compilation, or derivative work, and finding its original sources.

Analyze this video metadata:
Title: ${String(metadata.title ?? '')}
Description: ${String(metadata.description ?? '')}
Tags: ${((metadata.tags as string[]) ?? []).join(', ')}
Channel: ${String(metadata.channel ?? '')}
Categories: ${((metadata.categories as string[]) ?? []).join(', ')}

Your task:
1. Determine if this video is likely a remix, reediting, compilation, or derivative of other content
2. Extract keywords that would help find the original source videos on YouTube
3. Generate 3-5 specific YouTube search queries to find the original source videos

Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "isRemix": boolean,
  "analysis": "brief explanation of what this video appears to be",
  "keywords": ["keyword1", "keyword2", ...],
  "searchQueries": ["specific youtube search query 1", "specific youtube search query 2", ...]
}`

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      // Strip markdown code blocks if present
      const jsonText = text.replace(/^```json\s*|\s*```$/g, '').trim()
      return JSON.parse(jsonText) as GeminiAnalysisResult
    } catch (err) {
      this.logger.error('Gemini analysis failed', err)
      const title = String(metadata.title ?? '')
      return {
        keywords: [title],
        searchQueries: [title],
        analysis: 'Analysis failed, using title as fallback',
        isRemix: false,
      }
    }
  }

  private async searchYouTube(searchQueries: string[], keywords: string[]): Promise<GeminiSourceResult[]> {
    const youtubeApiKey = this.config.get<string>('YOUTUBE_API_KEY')
    if (!youtubeApiKey) {
      this.logger.warn('YOUTUBE_API_KEY not configured')
      return []
    }

    const allResults = new Map<string, GeminiSourceResult>()

    for (let i = 0; i < Math.min(searchQueries.length, 3); i++) {
      const query = searchQueries[i]
      try {
        const params = new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: '10',
          key: youtubeApiKey,
          relevanceLanguage: 'fr',
          safeSearch: 'none',
        })
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
        if (!res.ok) continue
        const data = (await res.json()) as {
          items?: Array<{
            id: { videoId: string }
            snippet: {
              title: string
              channelTitle: string
              publishedAt: string
              thumbnails: { high?: { url: string }; default?: { url: string } }
            }
          }>
        }

        for (const item of data.items ?? []) {
          const videoId = item.id.videoId
          if (!videoId || allResults.has(videoId)) continue

          // Calculate relevance score based on query position and keyword matches
          const title = item.snippet.title.toLowerCase()
          const keywordMatches = keywords.filter((k) => title.includes(k.toLowerCase())).length
          const relevanceScore = Math.min(100, 50 + keywordMatches * 10 + (2 - i) * 10)

          allResults.set(videoId, {
            videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.snippet.publishedAt,
            relevanceScore,
            matchReason: `Found via query: "${query}"`,
          })
        }
      } catch (err) {
        this.logger.error(`YouTube search failed for query "${query}"`, err)
      }
    }

    return Array.from(allResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
  }
}
