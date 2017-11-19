import { PromiseOr } from './promises';

export class Completer<T> {
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
  resolve: (value?: PromiseOr<T>) => void;
  reject: (reason?: any) => void;

  complete(executeFn: () => PromiseOr<T>): void {
    try {
      this.resolve(executeFn());
    } catch (e) {
      this.reject(e);
    }
  }
}
