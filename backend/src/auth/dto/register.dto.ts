import { IsEmail, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string

  @IsString()
  @MinLength(8, { message: 'Minimum 8 caractères' })
  password: string
}
