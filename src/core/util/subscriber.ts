import { Environment } from 'core/environment/environment';
import { EventEmitter } from 'events';
import { Subscription } from 'rxjs';
import { Disposable } from 'core/util/disposable';

type EventType = string | symbol;
type Listener = (...args: any[]) => void;

export class Subscriber implements Disposable {
  private listeners: Array<[EventType, Listener]> = [];
  private disposeSubscriptions: Subscription[] = [];

  constructor(
      private eventEmitter: EventEmitter,
      private environment: Environment) {}

  on(event: EventType, listener: Listener): void {
    this.listeners.push([event, listener]);
    this.eventEmitter.on(event, listener);
  }

  onDispose(listener: () => void): void {
    this.disposeSubscriptions.push(this.environment.onDispose(listener));
  }

  removeListeners(): void {
    for (const [event, listener] of this.listeners) {
      this.eventEmitter.removeListener(event, listener);
    }
    this.listeners = [];
    for (const sub of this.disposeSubscriptions) {
      sub.unsubscribe();
    }
    this.disposeSubscriptions = [];
  }

  dispose(): void {
    this.removeListeners();
  }
}
