export type TSendAuthEmailPayload = {
  to: string
  subject: string
  html: string
  from?: string
}