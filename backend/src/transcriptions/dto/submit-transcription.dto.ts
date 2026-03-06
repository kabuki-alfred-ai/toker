import { IsUrl } from 'class-validator'

export class SubmitTranscriptionDto {
  @IsUrl({}, { message: 'URL invalide' })
  videoUrl: string
}
