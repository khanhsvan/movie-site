import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhooks/stripe')
  stripeWebhook(@Headers('stripe-signature') signature: string | undefined, @Body() body: unknown) {
    return this.paymentsService.handleStripeWebhook(signature, body);
  }
}

