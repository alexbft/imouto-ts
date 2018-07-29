import { Duration } from 'moment';
import { Observable } from 'rxjs/Observable';

export type PromiseOr<T> = T | PromiseLike<T>;

export type AsyncHandler<T> = () => PromiseOr<T>;

export function isPromise<T>(p: any): p is PromiseLike<T> {
  return 'then' in p;
}

export function timeout<T>(p: Promise<T>, delay: Duration): Promise<T> {
  return Observable.fromPromise(p).timeout(delay.asMilliseconds()).toPromise();
}
