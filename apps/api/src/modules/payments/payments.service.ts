import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  handleStripeWebhook(signature: string | undefined, payload: unknown) {
    return {
      received: true,
      signaturePresent: Boolean(signature),
      eventType: (payload as { type?: string })?.type ?? 'unknown'
    };
  }
}

