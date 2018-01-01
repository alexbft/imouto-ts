import { Observable, Subscription } from 'rxjs';
import { Duration } from 'moment';
import { Completer } from 'core/util/completer';
import { Injectable } from 'core/di/injector';

@Injectable
export class Environment {
  private _isDisposing = false;
  private readonly disposingCompleter: Completer<void>;
  private readonly disposingStream: Observable<void>;

  constructor() {
    this.disposingCompleter = new Completer<void>();
    this.disposingStream = Observable.fromPromise(this.disposingCompleter.promise);
  }

  get isDisposing(): boolean {
    return this._isDisposing;
  }

  startDisposing(): void {
    this._isDisposing = true;
    this.disposingCompleter.resolve();
  }

  onDispose(fn: () => void): Subscription {
    return this.disposingStream.subscribe(fn);
  }

  pause(delay: Duration): Promise<void> {
    return this.disposingStream.timeout(delay.asMilliseconds()).toPromise().catch(() => {});
  }
}
