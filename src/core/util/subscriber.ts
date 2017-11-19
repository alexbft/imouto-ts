import { EventEmitter } from 'events';
import { Subscription } from 'most';
import { Environment } from 'core/environment/environment';
import { Disposable } from './disposable';

type EventType = string | symbol;
type Listener = (...args: any[]) => void;

export class Subscriber implements Disposable {
  private listeners: [EventType, Listener][] = [];
  private disposeSubscriptions: Subscription<void>[] = [];

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
    for (let [event, listener] of this.listeners) {
      this.eventEmitter.removeListener(event, listener);
    }
    this.listeners = [];
    for (let sub of this.disposeSubscriptions) {
      sub.unsubscribe();
    }
    this.disposeSubscriptions = [];
  }

  dispose(): void {
    this.removeListeners();
  }
}
