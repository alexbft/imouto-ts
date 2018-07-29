import { Duration } from 'moment';
import { Scheduler as RxScheduler, Subscription } from 'rxjs';
import { Injectable } from 'core/di/injector';

@Injectable
export class Scheduler {
  schedule(fn: () => void, delay: Duration): Subscription {
    return RxScheduler.async.schedule(fn, delay.asMilliseconds());
  }
}
