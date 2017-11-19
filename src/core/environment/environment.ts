import { Stream, fromPromise, Subscription } from 'most';
import { Duration } from 'moment';
import { Completer } from 'core/util/completer';
import { timeout } from 'core/util/promises';

export class Environment {
  private _isDisposing = false;
  private readonly disposingCompleter: Completer<void>;
  private readonly disposingStream: Stream<void>;

  constructor() {
    this.disposingCompleter = new Completer<void>();
    this.disposingStream = fromPromise(this.disposingCompleter.promise);
  }

  get isDisposing(): boolean {
    return this._isDisposing;
  }

  startDisposing(): void {
    this._isDisposing = true;
    this.disposingCompleter.resolve();
  }

  onDispose(fn: () => void): Subscription<void> {
    return this.disposingStream.subscribe({
      next: fn,
      error: (_) => {},
      complete: () => {}
    });
  }

  pause(delay: Duration): Promise<void> {
    return timeout(this.disposingStream, delay, () => {});
  }
}
