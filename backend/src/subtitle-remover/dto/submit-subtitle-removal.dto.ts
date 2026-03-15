import { IsUrl } from 'class-validator'

export class SubmitSubtitleRemovalDto {
  @IsUrl({}, { message: 'URL invalide' })
  videoUrl: string
}
