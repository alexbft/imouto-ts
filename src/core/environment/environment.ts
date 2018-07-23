import * as moment from 'moment';
import { Injectable } from 'core/di/injector';
import { ISubscription } from 'rxjs/Subscription';
import { AsyncHandler, timeout } from 'core/util/promises';
import { logger } from 'core/logging/logger';
import { safeExecute } from 'core/util/misc';

const disposeTimeout = moment.duration(60, 'seconds');

@Injectable
export class Environment {
  private _isDisposing = false;
  private _disposeSubscriptions: DisposeSubscription[] = [];

  constructor() {}

  get isDisposing(): boolean {
    return this._isDisposing;
  }

  async dispose(): Promise<void> {
    if (this._isDisposing) {
      throw new Error('Already disposing');
    }
    this._isDisposing = true;
    try {
      const disposeWait = Promise.all(this._disposeSubscriptions.map(s => safeExecute(s.handler)));
      await timeout(disposeWait, disposeTimeout);
    } catch (e) {
      logger.error(e.stack || e);
    }
    process.exit();
  }

  onDispose(handler: AsyncHandler<any>): ISubscription {
    const subscription: DisposeSubscription =
        new DisposeSubscription(() => this.removeDisposeSubscription(subscription), handler);
    this.addDisposeSubscription(subscription);
    return subscription;
  }

  async markCritical<T>(promise: Promise<T>): Promise<T> {
    const subscription = this.onDispose(() => promise);
    try {
      return await promise;
    } finally {
      subscription.unsubscribe();
    }
  }

  private addDisposeSubscription(subscription: DisposeSubscription): void {
    this._disposeSubscriptions.push(subscription);
  }

  private removeDisposeSubscription(subscription: DisposeSubscription): void {
    const ix = this._disposeSubscriptions.indexOf(subscription);
    if (ix !== -1) {
      this._disposeSubscriptions.splice(ix, 1);
    }
  }
}

class DisposeSubscription implements ISubscription {
  private _closed = false;

  constructor(
      private _unsubscribe: () => void,
      public handler: AsyncHandler<any>) {}

  get closed(): boolean {
    return this._closed;
  }

  unsubscribe(): void {
    if (this._closed) {
      throw new Error('Subscription is already closed');
    }
    this._closed = true;
    this._unsubscribe();
  }
}
