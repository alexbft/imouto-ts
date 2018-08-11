import { Duration, duration } from 'moment';
import { Scheduler as RxScheduler, Subscription, Subject } from 'rxjs';
import { Injectable } from 'core/di/injector';
import { PromiseOr } from 'core/util/promises';
import { safeExecute } from 'core/util/misc';

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
    return RxScheduler.async.schedule(action, delay.asMilliseconds());
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
