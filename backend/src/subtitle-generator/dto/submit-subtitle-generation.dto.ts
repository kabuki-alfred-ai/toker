import { IsUrl, IsIn, IsOptional, IsNumber, IsString, Min, Max, IsObject } from 'class-validator'

export class SubmitSubtitleGenerationDto {
  @IsUrl({}, { message: 'URL invalide' })
  videoUrl: string

  @IsOptional()
  @IsIn(['KARAOKE', 'BOLD_SHADOW', 'PILL', 'OUTLINE'])
  preset?: string

  @IsOptional()
  @IsObject()
  customization?: {
    fontSize?: number
    color?: string
    highlightColor?: string
    bgColor?: string
    position?: 'top' | 'center' | 'bottom'
  }
}
