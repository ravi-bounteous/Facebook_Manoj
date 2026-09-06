import { EmailMessage, EmailService } from "../../src/services/emailService";

export class FakeEmailService implements EmailService {
  sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
