import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator'

export class SubmitDownloadDto {
  @IsUrl({}, { message: 'URL invalide' })
  videoUrl: string

  @IsOptional()
  @IsString()
  @IsIn(['mp4', 'mp3', 'webm', 'm4a'])
  format?: string

  @IsOptional()
  @IsString()
  @IsIn(['240p', '360p', '480p', '720p', '1080p'])
  quality?: string
}
