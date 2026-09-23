import { TSendEmailPayload } from "@/modules/entities/types/email";

export interface IEmailService {
  send(message: TSendEmailPayload): Promise<void>;
}
