import { PromiseOr } from './promises';

export interface Disposable {
  dispose(): PromiseOr<void>;
}
