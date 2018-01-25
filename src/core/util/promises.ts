import { Duration } from 'moment';
import { fromPromise, Stream, Subscription } from 'most';
import { Completer } from './completer';

export type PromiseOr<T> = T|PromiseLike<T>;

export function isPromise<T>(p: any): p is PromiseLike<T> {
  return 'then' in p;
}

export function timeout<T>(
    source: Promise<T>|Stream<T>,
    delay: Duration,
    onTimeout?: () => PromiseOr<T>): Promise<T> {
  if (onTimeout == null) {
    onTimeout = () => {
      throw new Error('Promise timed out.');
    };
  }
  const result = new Completer<T>();
  let subscription: Subscription<T>;
  const timer = setTimeout(() => {
    subscription.unsubscribe();
    result.complete(onTimeout!);
  }, delay.asMilliseconds());
  const stream = isPromise(source) ? fromPromise(source) : source;
  subscription = stream.subscribe({
    next: (value) => {
      clearTimeout(timer);
      result.resolve(value);
    },
    error: (reason) => {
      clearTimeout(timer);
      result.reject(reason);
    },
    complete: () => {},
  });
  return result.promise;
}
