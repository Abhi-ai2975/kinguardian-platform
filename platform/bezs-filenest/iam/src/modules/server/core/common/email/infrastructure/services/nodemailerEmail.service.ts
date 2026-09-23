/**
 * @module common/email/nodemailerEmail
 * @description Nodemailer-based email service using Gmail SMTP with app password.
 *              Used by `sendAuthEmail` utility and all auth notification flows
 *              (verification, password reset, 2FA OTP, magic link, etc.).
 * @category Infrastructure
 * @layer Infrastructure
 */

import nodemailer from "nodemailer"
import { IEmailService } from "../../domain/interfaces/email.service.interface"
import { TSendEmailPayload } from "@/modules/entities/types/email"
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError"

export class NodemailerEmailService implements IEmailService {
  private transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async send(message: TSendEmailPayload): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:
          message.from ?? "betterauth-clean-architecture <gnvv2002@gmail.com>",
        to: message.to,
        subject: message.subject,
        html: message.html
      })
    } catch (error) {
      throw new InfrastructureError("Failed to send email", error)
    }
  }
}
