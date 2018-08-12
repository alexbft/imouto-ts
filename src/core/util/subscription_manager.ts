import { Disposable } from 'core/util/disposable';
import { Subscription } from 'rxjs';
import { removeItem } from 'core/util/misc';

export interface HasSubscription {
  subscription: Subscription;
}

export class SubscriptionManager<T extends HasSubscription> implements Disposable {
  subscriptions: T[] = [];

  constructor(private readonly subscriptionLimit: number = 20) { }

  add(subscription: T): void {
    if (this.subscriptions.length >= this.subscriptionLimit) {
      this.subscriptions.shift()!.subscription.unsubscribe();
    }
    this.subscriptions.push(subscription);
  }

  delete(subscription: T): boolean {
    const sub = removeItem(this.subscriptions, subscription);
    if (sub != null) {
      sub.subscription.unsubscribe();
      return true;
    } else {
      return false;
    }
  }

  dispose(): void {
    for (const sub of this.subscriptions) {
      sub.subscription.unsubscribe();
    }
    this.subscriptions = [];
  }
}
