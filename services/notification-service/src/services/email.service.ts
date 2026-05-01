import nodemailer, { Transporter } from 'nodemailer'
import logger from 'pino'

const log = logger()

export interface EmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export class EmailService {
  private transporter: Transporter

  constructor() {
    // Configuration based on environment
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp'

    if (emailProvider === 'sendgrid') {
      // SendGrid configuration
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY || '',
        },
      })
    } else {
      // SMTP configuration (Gmail, custom SMTP, etc.)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      })
    }
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@teleshop.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      }

      const info = await this.transporter.sendMail(mailOptions)

      log.info(`Email sent to ${options.to}: ${info.messageId}`)

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error(`Failed to send email to ${options.to}: ${errorMessage}`)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify()
      log.info('Email service verified successfully')
      return true
    } catch (error) {
      log.error('Email service verification failed:', error)
      return false
    }
  }
}
