import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private resend: Resend | null
  private readonly from: string

  constructor() {
    this.resend = process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production'
      ? new Resend(process.env.RESEND_API_KEY)
      : null
    this.from = process.env.EMAIL_FROM || 'Toker <noreply@kabukimono.tech>'
  }

  async sendTranscriptionFailedEmail(to: string, videoUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[DEV] Transcription failed email → ${to} (${videoUrl})`)
      return
    }
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Transcription échouée — crédit remboursé',
      text: `La transcription de ${videoUrl} a échoué (vidéo privée ou inaccessible). 1 crédit a été remboursé automatiquement sur votre compte.`,
    })
  }

  async sendCreditPurchasedEmail(to: string, credits: number): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[DEV] Credit purchased email → ${to} (${credits} crédits)`)
      return
    }
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Achat confirmé — ${credits} crédits ajoutés`,
      text: `Votre achat a été confirmé. ${credits} crédits ont été ajoutés à votre compte Toker.`,
    })
  }

  async sendWelcomeEmail(to: string, credits: number): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[DEV] Welcome email → ${to} (${credits} crédits)`)
      return
    }
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Bienvenue sur Toker 🎉',
      text: `Bienvenue ! Vous avez reçu ${credits} crédits gratuits pour commencer à transcrire vos vidéos.`,
    })
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[DEV] Password reset email → ${to} — URL: ${resetUrl}`)
      return
    }
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Vous avez demandé à réinitialiser votre mot de passe Toker.\n\nCliquez sur ce lien (valable 1 heure) :\n${resetUrl}\n\nSi vous n'avez pas fait cette demande, ignorez cet email.`,
      html: `<p>Vous avez demandé à réinitialiser votre mot de passe Toker.</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a> (lien valable 1 heure)</p><p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>`,
    })
  }
}
