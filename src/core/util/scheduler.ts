import { Duration, duration } from 'moment';
import { Subscription, Subject } from 'rxjs';
import { Injectable } from 'core/di/injector';
import { PromiseOr } from 'core/util/promises';
import { safeExecute, maxDelayNodeJs, pause } from 'core/util/misc';

type Action = () => void;
type AsyncAction = () => PromiseOr<any>;

const lowPriorityInterval = duration(15, 'seconds').asMilliseconds();

@Injectable
export class Scheduler {
  private readonly lowPrioritySubject = new Subject<AsyncAction>();

  constructor() {
    this.lowPrioritySubject.bufferTime(lowPriorityInterval).subscribe(actions => this.executeLowPriority(actions));
  }

  schedule(action: Action, delay: Duration): Subscription {
    const delayMs = delay.asMilliseconds();
    if (delayMs < maxDelayNodeJs) {
      const timer = setTimeout(action, delayMs);
      return new Subscription(() => clearTimeout(timer));
    } else {
      let isCancelled: boolean = false;
      const wait = async () => {
        await pause(delay);
        if (!isCancelled) {
          action();
        }
      }
      wait();
      return new Subscription(() => isCancelled = true);
    }
  }

  scheduleLowPriority(action: AsyncAction): void {
    this.lowPrioritySubject.next(action);
  }

  async executeLowPriority(actions: AsyncAction[]): Promise<void> {
    for (const action of actions) {
      await safeExecute(action);
    }
  }
}
