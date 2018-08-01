import { Disposable } from 'core/util/disposable';
import { Subscription } from 'rxjs';

export class SubscriptionManager implements Disposable {
  private subscriptions: Subscription[] = [];

  constructor(private readonly subscriptionLimit: number = 20) { }

  add(subscription: Subscription): void {
    if (this.subscriptions.length >= this.subscriptionLimit) {
      this.subscriptions.shift()!.unsubscribe();
    }
    this.subscriptions.push(subscription);
  }

  dispose(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = [];
  }
}
