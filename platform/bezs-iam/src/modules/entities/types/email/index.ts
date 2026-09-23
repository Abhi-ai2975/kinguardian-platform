export type TSendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};
