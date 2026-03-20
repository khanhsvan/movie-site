import { Injectable } from '@nestjs/common';
import { AuthenticatedViewer, SubscriptionStatus } from '@netflix-mini/types';

@Injectable()
export class SubscriptionsService {
  checkout() {
    return {
      checkoutUrl: 'https://checkout.stripe.com/demo'
    };
  }

  billingPortal() {
    return {
      portalUrl: 'https://billing.stripe.com/demo'
    };
  }

  current(user: AuthenticatedViewer) {
    return {
      status: user.subscriptionStatus ?? SubscriptionStatus.INCOMPLETE,
      renewalDate: '2026-04-18T00:00:00.000Z',
      planName: user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Premium Monthly' : 'Free'
    };
  }
}
