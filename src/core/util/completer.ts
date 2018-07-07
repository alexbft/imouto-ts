import { PromiseOr } from './promises';

export class Completer<T> {
  resolve: (value?: PromiseOr<T>) => void = _ => {};
  reject: (reason?: any) => void = _ => {};

  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });

  complete(executeFn: () => PromiseOr<T>): void {
    try {
      this.resolve(executeFn());
    } catch (e) {
      this.reject(e);
    }
  }
}
